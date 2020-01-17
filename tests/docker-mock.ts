/**
 * @license
 * Copyright 2019 Balena Ltd.
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

import * as _ from 'lodash';
import * as path from 'path';

import { NockMock, ScopeOpts } from './nock-mock';

const dockerResponsePath = path.normalize(
	path.join(__dirname, 'test-data', 'docker-response'),
);

export class DockerMock extends NockMock {
	constructor() {
		super(/localhost/);
	}

	public expectGetPing(opts: ScopeOpts = {}) {
		this.optGet('/_ping', opts).reply(200, 'OK');
	}

	public expectGetInfo(opts: ScopeOpts = {}) {
		// this body is a partial copy from Docker for Mac v18.06.1-ce-mac73
		const body = {
			KernelVersion: '4.9.93-linuxkit-aufs',
			OperatingSystem: 'Docker for Mac',
			OSType: 'linux',
			Architecture: 'x86_64',
		};
		this.optGet('/info', opts).reply(200, body);
	}

	public expectGetVersion(opts: ScopeOpts = {}) {
		// this body is partial copy from Docker for Mac v18.06.1-ce-mac73
		const body = {
			Platform: {
				Name: '',
			},
			Version: '18.06.1-ce',
			ApiVersion: '1.38',
			MinAPIVersion: '1.12',
			GitCommit: 'e68fc7a',
			GoVersion: 'go1.10.3',
			Os: 'linux',
			Arch: 'amd64',
			KernelVersion: '4.9.93-linuxkit-aufs',
			Experimental: true,
			BuildTime: '2018-08-21T17:29:02.000000000+00:00',
		};
		this.optGet('/version', opts).reply(200, body);
	}

	public expectPostBuild(opts: {
		optional?: boolean;
		persist?: boolean;
		responseBody: any;
		responseCode: number;
		tag: string;
		checkBuildRequestBody: (requestBody: string) => Promise<void>;
	}) {
		this.optPost(
			new RegExp(`^/build\\?t=${_.escapeRegExp(opts.tag)}&`),
			opts,
		).reply(async function(_uri, requestBody, cb) {
			let error: Error | null = null;
			try {
				const assert = await import('assert');
				assert.ok(typeof requestBody === 'string');
				if (typeof requestBody === 'string') {
					await opts.checkBuildRequestBody(requestBody);
				} else {
					throw new Error(
						`unexpected requestBody type "${typeof requestBody}"`,
					);
				}
			} catch (err) {
				error = err;
			}
			cb(error, [opts.responseCode, opts.responseBody]);
		});
	}

	public expectGetImages(opts: ScopeOpts = {}) {
		// this body is partial copy from Docker for Mac v18.06.1-ce-mac73
		const body = {
			Size: 1199596,
		};
		this.optGet(/^\/images\//, opts).reply(200, body);
	}

	public expectDeleteImages(opts: ScopeOpts = {}) {
		this.optDelete(/^\/images\//, opts).reply(200, [
			{
				Untagged:
					'registry2.balena-cloud.com/v2/c089c421fb2336d0475166fbf3d0f9fa:latest',
			},
			{
				Untagged:
					'registry2.balena-cloud.com/v2/c089c421fb2336d0475166fbf3d0f9fa@sha256:444a5e0c57eed51f5e752b908cb95188c25a0476fc6e5f43e5113edfc4d07199',
			},
		]);
	}

	public expectPostImagesTag(opts: ScopeOpts = {}) {
		this.optPost(/^\/images\/.+?\/tag\?/, opts).reply(201);
	}

	public expectPostImagesPush(opts: ScopeOpts = {}) {
		this.optPost(/^\/images\/.+?\/push/, opts).replyWithFile(
			200,
			path.join(dockerResponsePath, 'images-push-POST.json'),
			{
				'api-version': '1.38',
				'Content-Type': 'application/json',
			},
		);
	}
}
