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
import * as nock from 'nock';

export class DockerMock {
	public static basePathPattern = /localhost/;
	public readonly scope: nock.Scope;
	// Expose `scope` as `expect` to allow for better semantics in tests
	public readonly expect = this.scope;

	// For debugging tests
	get unfulfilledCallCount(): number {
		return this.scope.pendingMocks().length;
	}

	constructor() {
		// nock.cleanAll();

		if (!nock.isActive()) {
			nock.activate();
		}

		this.scope = nock(DockerMock.basePathPattern);

		nock.emitter.on('no match', this.handleUnexpectedRequest);
	}

	public done() {
		// scope.done() will throw an error if there are expected api calls that have not happened.
		// So ensures that all expected calls have been made.
		this.scope.done();
		// Remove 'no match' handler, for tests using nock without this module
		nock.emitter.removeListener('no match', this.handleUnexpectedRequest);
		// Restore unmocked behavior
		nock.cleanAll();
		nock.restore();
	}

	protected handleUnexpectedRequest(req: any) {
		console.error(`Unexpected http request!: ${req.path}`);
		// Errors thrown here are not causing the tests to fail for some reason.
		// Possibly due to CLI global error handlers? (error.js)
		// (Also, nock should automatically throw an error, but also not happening)
		// For now, the console.error is sufficient (will fail the test)
	}

	public expectPing(opts = { optional: false, persist: true }) {
		const get = (opts.persist ? this.scope.persist() : this.scope).get(
			'/_ping',
		);
		(opts.optional ? get.optionally() : get).reply(200, 'OK');
	}

	public expectInfo(opts = { optional: false, persist: true }) {
		// this body is a partial copy from Docker for Mac v18.06.1-ce-mac73
		const body = {
			KernelVersion: '4.9.93-linuxkit-aufs',
			OperatingSystem: 'Docker for Mac',
			OSType: 'linux',
			Architecture: 'x86_64',
		};
		const get = (opts.persist ? this.scope.persist() : this.scope).get('/info');
		(opts.optional ? get.optionally() : get).reply(200, body);
	}

	public expectVersion(opts = { optional: false, persist: true }) {
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
		const get = (opts.persist ? this.scope.persist() : this.scope).get(
			'/version',
		);
		(opts.optional ? get.optionally() : get).reply(200, body);
	}

	public expectBuild(opts: {
		optional?: boolean;
		persist?: boolean;
		responseBody: any;
		responseCode: number;
		tag: string;
		checkBuildRequestBody: (requestBody: string) => Promise<void>;
	}) {
		const post = (opts.persist ? this.scope.persist() : this.scope).post(
			new RegExp(`^/build\\?t=${_.escapeRegExp(opts.tag)}&`),
		);
		(opts.optional ? post.optionally() : post).reply(async function(
			_uri,
			requestBody,
			cb,
		) {
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

	public expectImages(opts = { optional: false, persist: true }) {
		// this body is partial copy from Docker for Mac v18.06.1-ce-mac73
		const body = {
			Size: 1199596,
		};
		const get = (opts.persist ? this.scope.persist() : this.scope).get(
			/^\/images\//,
		);
		(opts.optional ? get.optionally() : get).reply(200, body);
	}
}
