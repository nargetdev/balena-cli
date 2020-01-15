/**
 * @license
 * Copyright 2020 Balena Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { configureBluebird } from '../../build/app-common';

configureBluebird();

import { expect } from 'chai';
import { stripIndent } from 'common-tags';
import { fs } from 'mz';
import * as path from 'path';
import { PathUtils } from 'resin-multibuild';
import { Readable } from 'stream';
import * as tar from 'tar-stream';
import { streamToBuffer } from 'tar-utils';

import { BalenaAPIMock } from '../balena-api-mock';
import { DockerMock } from '../docker-mock';
import { monochrome, runCommand } from '../helpers';

describe('balena build', function() {
	let api: BalenaAPIMock;
	let docker: DockerMock;

	this.beforeAll(() => {
		api = new BalenaAPIMock();
		docker = new DockerMock();
	});

	this.beforeEach(() => {
		api.expectWhoAmI(true);
		api.expectMixpanel();
		docker.expectPing();
		docker.expectInfo();
		docker.expectVersion();
		docker.expectImages();
	});

	this.afterEach(() => {
		// Check all expected api calls have been made and clean up.
		api.done();
		docker.done();
	});

	it('should create the expected tar stream', async () => {
		const repoRoot = path.normalize(path.join(__dirname, '..', '..'));
		const projectPath = PathUtils.toNativePath(
			'tests/test-projects/no-docker-compose/basic',
		);
		const expectedFiles: FoundFiles = {
			'src/start.sh': { fileSize: 89, type: 'file' },
			Dockerfile: { fileSize: 85, type: 'file' },
		};
		const responseBody = stripIndent`
			{"stream":"Step 1/4 : FROM busybox"}
			{"stream":"\\n"}
			{"stream":" ---\\u003e 64f5d945efcc\\n"}
			{"stream":"Step 2/4 : COPY ./src/start.sh /start.sh"}
			{"stream":"\\n"}
			{"stream":" ---\\u003e Using cache\\n"}
			{"stream":" ---\\u003e 97098fc9d757\\n"}
			{"stream":"Step 3/4 : RUN chmod a+x /start.sh"}
			{"stream":"\\n"}
			{"stream":" ---\\u003e Using cache\\n"}
			{"stream":" ---\\u003e 33728e2e3f7e\\n"}
			{"stream":"Step 4/4 : CMD [\\"/start.sh\\"]"}
			{"stream":"\\n"}
			{"stream":" ---\\u003e Using cache\\n"}
			{"stream":" ---\\u003e 2590e3b11eaf\\n"}
			{"aux":{"ID":"sha256:2590e3b11eaf739491235016b53fec5d209c81837160abdd267c8fe5005ff1bd"}}
			{"stream":"Successfully built 2590e3b11eaf\\n"}
			{"stream":"Successfully tagged basic_main:latest\\n"}`;

		docker.expectBuild({
			tag: 'basic_main',
			responseCode: 200,
			responseBody,
			checkBuildRequestBody: (buildRequestBody: string) =>
				checkBuildRequestBody(buildRequestBody, expectedFiles, projectPath),
		});

		const { out, err } = await runCommand(
			`build ${projectPath} --deviceType nuc --arch amd64`,
		);

		expect(err).to.have.ordered.members([]);
		expect(
			out
				.join('')
				.split('\n')
				.map(line => {
					// remove colors, absolute path prefix and elapsed time
					return monochrome(line)
						.replace(repoRoot, '')
						.replace(/in \d+ seconds/, 'in 0 seconds');
				}),
		).to.include.members([
			'[Info]    Creating default composition with source: /tests/test-projects/no-docker-compose/basic',
			'[Info]    Building for amd64/nuc',
			'[Info]    Docker Desktop detected (daemon architecture: "x86_64")',
			'[Info]      Docker itself will determine and enable architecture emulation if required,',
			'[Info]      without balena-cli intervention and regardless of the --emulated option.',
			'[Build]   Built 1 service in 0 seconds',
			'[Build]   main Image size: 1.14 MB',
			'[Success] Build succeeded!',
			'',
		]);
	});
});

interface FoundFiles {
	[filePath: string]: {
		fileSize: number;
		type: tar.Headers['type'];
	};
}

async function checkBuildRequestBody(
	buildRequestBody: string,
	expectedFiles: FoundFiles,
	projectPath: string,
): Promise<void> {
	// string to stream: https://stackoverflow.com/a/22085851
	const sourceTarStream = new Readable();
	sourceTarStream._read = () => undefined;
	sourceTarStream.push(buildRequestBody);
	sourceTarStream.push(null);

	const found: FoundFiles = await new Promise((resolve, reject) => {
		const foundFiles: FoundFiles = {};
		const extract = tar.extract();
		extract.on('error', reject);
		extract.on(
			'entry',
			async (header: tar.Headers, stream: Readable, next: tar.Callback) => {
				try {
					expect(foundFiles).to.not.have.property(header.name);
					foundFiles[header.name] = {
						fileSize: header.size || 0,
						type: header.type,
					};
					const [buf, buf2] = await Promise.all([
						streamToBuffer(stream),
						fs.readFile(
							path.join(projectPath, PathUtils.toNativePath(header.name)),
						),
					]);
					expect(buf.equals(buf2)).to.be.true;
				} catch (err) {
					reject(err);
				}
				next();
			},
		);
		extract.once('finish', () => {
			resolve(foundFiles);
		});
		sourceTarStream.on('error', reject);
		sourceTarStream.pipe(extract);
	});

	expect(found).to.deep.equal(expectedFiles);
}
