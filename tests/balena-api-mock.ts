/**
 * @license
 * Copyright 2019-2020 Balena Ltd.
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

const apiResponsePath = path.normalize(
	path.join(__dirname, 'test-data', 'api-response'),
);

export class BalenaAPIMock extends NockMock {
	constructor() {
		super(/api\.balena-cloud\.com/);
	}

	public expectGetApplication(opts: ScopeOpts = {}) {
		this.optGet(/^\/v5\/application/, opts).replyWithFile(
			200,
			path.join(apiResponsePath, 'application-GET-v5-expanded-app-type.json'),
			{
				'Content-Type': 'application/json',
			},
		);
	}

	public expectGetApp(opts: ScopeOpts = {}) {
		this.optGet(/^\/v\d+\/application($|\?)/, opts).reply(200, {
			d: [{ id: 1234567 }],
		});
	}

	public expectGetAuth(opts: ScopeOpts = {}) {
		this.optGet(/^\/auth\/v1\//, opts).reply(200, {
			// "token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlJZVFk6TlE3WDpKSDVCOlFFWFk6RkU2TjpLTlVVOklWNTI6TFFRQTo3UjRWOjJVUFI6Qk9ISjpDNklPIn0.eyJqdGkiOiI3ZTNlN2RmMS1iYjljLTQxZTMtOTlkMi00NjVlMjE4YzFmOWQiLCJuYmYiOjE1NzkxOTQ1MjgsImFjY2VzcyI6W3sibmFtZSI6InYyL2MwODljNDIxZmIyMzM2ZDA0NzUxNjZmYmYzZDBmOWZhIiwidHlwZSI6InJlcG9zaXRvcnkiLCJhY3Rpb25zIjpbInB1bGwiLCJwdXNoIl19LHsibmFtZSI6InYyLzljMDBjOTQxMzk0MmNkMTVjZmM5MTg5YzVkYWMzNTlkIiwidHlwZSI6InJlcG9zaXRvcnkiLCJhY3Rpb25zIjpbInB1bGwiLCJwdXNoIl19XSwiaWF0IjoxNTc5MTk0NTM4LCJleHAiOjE1NzkyMDg5MzgsImF1ZCI6InJlZ2lzdHJ5Mi5iYWxlbmEtY2xvdWQuY29tIiwiaXNzIjoiYXBpLmJhbGVuYS1jbG91ZC5jb20iLCJzdWIiOiJnaF9wYXVsb19jYXN0cm8ifQ.bRw5_lg-nT-c1V4RxIJjujfPuVewZTs0BRNENEw2-sk_6zepLs-sLl9DOSEHYBdi87EtyCiUB3Wqee6fvz2HyQ"
			token: 'test',
		});
	}

	public expectGetRelease(opts: ScopeOpts = {}) {
		this.optGet(/^\/v5\/release/, opts).replyWithFile(
			200,
			path.join(apiResponsePath, 'release-GET-v5.json'),
			{
				'Content-Type': 'application/json',
			},
		);
	}

	public expectPatchRelease(opts: ScopeOpts = {}) {
		this.optPatch(/^\/v5\/release/, opts).reply(200, 'OK');
	}

	public expectPostRelease(opts: ScopeOpts = {}) {
		this.optPost(/^\/v5\/release/, opts).replyWithFile(
			200,
			path.join(apiResponsePath, 'release-POST-v5.json'),
			{
				'Content-Type': 'application/json',
			},
		);
	}

	public expectPatchImage(opts: ScopeOpts = {}) {
		this.optPatch(/^\/v5\/image/, opts).reply(200, 'OK');
	}

	public expectPostImage(opts: ScopeOpts = {}) {
		this.optPost(/^\/v5\/image/, opts).replyWithFile(
			200,
			path.join(apiResponsePath, 'image-POST-v5.json'),
			{
				'Content-Type': 'application/json',
			},
		);
	}

	public expectGetDevice(opts: {
		fullUUID: string;
		inaccessibleApp?: boolean;
		optional?: boolean;
		persist?: boolean;
	}) {
		const id = 7654321;
		this.optGet(/^\/v\d+\/device($|\?)/, opts).reply(200, {
			d: [
				{
					id,
					uuid: opts.fullUUID,
					belongs_to__application: opts.inaccessibleApp
						? []
						: [{ app_name: 'test' }],
				},
			],
		});
	}

	public expectGetAppEnvVars(opts: ScopeOpts = {}) {
		this.optGet(/^\/v\d+\/application_environment_variable($|\?)/, opts).reply(
			200,
			{
				d: [
					{
						id: 120101,
						name: 'var1',
						value: 'var1-val',
					},
					{
						id: 120102,
						name: 'var2',
						value: '22',
					},
				],
			},
		);
	}

	public expectGetAppConfigVars(opts: ScopeOpts = {}) {
		this.optGet(/^\/v\d+\/application_config_variable($|\?)/, opts).reply(200, {
			d: [
				{
					id: 120300,
					name: 'RESIN_SUPERVISOR_NATIVE_LOGGER',
					value: 'false',
				},
			],
		});
	}

	public expectGetAppServiceVars(opts: ScopeOpts = {}) {
		this.optGet(/^\/v\d+\/service_environment_variable($|\?)/, opts).reply(
			function(uri, _requestBody) {
				const match = uri.match(/service_name%20eq%20%27(.+?)%27/);
				const serviceName = (match && match[1]) || undefined;
				let varArray: any[];
				if (serviceName) {
					const varObj = appServiceVarsByService[serviceName];
					varArray = varObj ? [varObj] : [];
				} else {
					varArray = _.map(appServiceVarsByService, value => value);
				}
				return [200, { d: varArray }];
			},
		);
	}

	public expectGetDeviceEnvVars(opts: ScopeOpts = {}) {
		this.optGet(/^\/v\d+\/device_environment_variable($|\?)/, opts).reply(200, {
			d: [
				{
					id: 120203,
					name: 'var3',
					value: 'var3-val',
				},
				{
					id: 120204,
					name: 'var4',
					value: '44',
				},
			],
		});
	}

	public expectGetDeviceConfigVars(opts: ScopeOpts = {}) {
		this.optGet(/^\/v\d+\/device_config_variable($|\?)/, opts).reply(200, {
			d: [
				{
					id: 120400,
					name: 'RESIN_SUPERVISOR_POLL_INTERVAL',
					value: '900900',
				},
			],
		});
	}

	public expectGetDeviceServiceVars(opts: ScopeOpts = {}) {
		this.optGet(
			/^\/v\d+\/device_service_environment_variable($|\?)/,
			opts,
		).reply(function(uri, _requestBody) {
			const match = uri.match(/service_name%20eq%20%27(.+?)%27/);
			const serviceName = (match && match[1]) || undefined;
			let varArray: any[];
			if (serviceName) {
				const varObj = deviceServiceVarsByService[serviceName];
				varArray = varObj ? [varObj] : [];
			} else {
				varArray = _.map(deviceServiceVarsByService, value => value);
			}
			return [200, { d: varArray }];
		});
	}

	public expectGetDeviceTypes(opts: ScopeOpts = {}) {
		this.optGet('/device-types/v1', opts).replyWithFile(
			200,
			path.join(apiResponsePath, 'device-types-GET-v1.json'),
			{
				'Content-Type': 'application/json',
			},
		);
	}

	public expectGetConfigVars(opts: ScopeOpts = {}) {
		this.optGet('/config/vars', opts).reply(200, {
			reservedNames: [],
			reservedNamespaces: [],
			invalidRegex: '/^d|W/',
			whiteListedNames: [],
			whiteListedNamespaces: [],
			blackListedNames: [],
			configVarSchema: [],
		});
	}

	public expectGetService(opts: {
		optional?: boolean;
		persist?: boolean;
		serviceId?: number;
		serviceName: string;
	}) {
		const serviceId = opts.serviceId || 243768;
		this.optGet(/^\/v\d+\/service($|\?)/, opts).reply(200, {
			d: [{ id: serviceId, service_name: opts.serviceName }],
		});
	}

	public expectPostService404(opts: ScopeOpts = {}) {
		this.optPost(/^\/v\d+\/service$/, opts).reply(
			404,
			'Unique key constraint violated',
		);
	}

	public expectGetUser(opts: ScopeOpts = {}) {
		this.optGet(/^\/v5\/user/, opts).reply(200, {
			d: [
				{
					id: 99999,
					actor: 1234567,
					username: 'gh_bob',
					created_at: '2018-08-19T13:55:04.485Z',
					__metadata: {
						uri: '/resin/user(@id)?@id=43699',
					},
				},
			],
		});
	}

	// User details are cached in the SDK
	// so often we don't know if we can expect the whoami request
	public expectGetWhoAmI(opts: ScopeOpts = {}) {
		this.optGet('/user/v1/whoami', opts).reply(200, {
			id: 99999,
			username: 'testuser',
			email: 'testuser@test.com',
		});
	}

	public expectGetMixpanel(opts: ScopeOpts = {}) {
		this.optGet(/^\/mixpanel\/track/, opts).reply(200, {});
	}
}

const appServiceVarsByService: { [key: string]: any } = {
	service1: {
		id: 120110,
		name: 'svar1',
		value: 'svar1-value',
		service: [
			{
				id: 210110,
				service_name: 'service1',
			},
		],
	},
	service2: {
		id: 120111,
		name: 'svar2',
		value: 'svar2-value',
		service: [
			{
				id: 210111,
				service_name: 'service2',
			},
		],
	},
};

const deviceServiceVarsByService: { [key: string]: any } = {
	service1: {
		id: 120120,
		name: 'svar3',
		value: 'svar3-value',
		service: [
			{
				id: 210110,
				service_name: 'service1',
			},
		],
	},
	service2: {
		id: 120121,
		name: 'svar4',
		value: 'svar4-value',
		service: [
			{
				id: 210111,
				service_name: 'service2',
			},
		],
	},
};
