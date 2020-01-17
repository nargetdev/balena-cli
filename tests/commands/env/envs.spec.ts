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

import { expect } from 'chai';
import { stripIndent } from 'common-tags';

import { BalenaAPIMock } from '../../balena-api-mock';
import { runCommand } from '../../helpers';

describe('balena envs', function() {
	const appName = 'test';
	let fullUUID: string;
	let shortUUID: string;
	let api: BalenaAPIMock;

	beforeEach(() => {
		api = new BalenaAPIMock();
		api.expectGetWhoAmI({ optional: true, persist: true });
		api.expectGetMixpanel({ optional: true });
		// Random device UUID used to frustrate _.memoize() in utils/cloud.ts
		fullUUID = require('crypto')
			.randomBytes(16)
			.toString('hex');
		shortUUID = fullUUID.substring(0, 7);
	});

	afterEach(() => {
		// Check all expected api calls have been made and clean up.
		api.done();
	});

	it('should successfully list env vars for a test app', async () => {
		api.expectGetApp();
		api.expectGetAppEnvVars();

		const { out, err } = await runCommand(`envs -a ${appName}`);

		expect(out.join('')).to.equal(
			stripIndent`
			ID     NAME VALUE
			120101 var1 var1-val
			120102 var2 22
			` + '\n',
		);
		expect(err.join('')).to.equal('');
	});

	it('should successfully list config vars for a test app', async () => {
		api.expectGetApp();
		api.expectGetAppConfigVars();

		const { out, err } = await runCommand(`envs -a ${appName} --config`);

		expect(out.join('')).to.equal(
			stripIndent`
			ID     NAME                           VALUE
			120300 RESIN_SUPERVISOR_NATIVE_LOGGER false
			` + '\n',
		);
		expect(err.join('')).to.equal('');
	});

	it('should successfully list config vars for a test app (JSON output)', async () => {
		api.expectGetApp();
		api.expectGetAppConfigVars();

		const { out, err } = await runCommand(`envs -cja ${appName}`);

		expect(JSON.parse(out.join(''))).to.deep.equal([
			{
				id: 120300,
				name: 'RESIN_SUPERVISOR_NATIVE_LOGGER',
				value: 'false',
			},
		]);
		expect(err.join('')).to.equal('');
	});

	it('should successfully list service variables for a test app (-s flag)', async () => {
		const serviceName = 'service2';
		api.expectGetService({ serviceName });
		api.expectGetApp();
		api.expectGetAppServiceVars();

		const { out, err } = await runCommand(
			`envs -a ${appName} -s ${serviceName}`,
		);

		expect(out.join('')).to.equal(
			stripIndent`
			ID     NAME  VALUE
			120111 svar2 svar2-value
			` + '\n',
		);
		expect(err.join('')).to.equal('');
	});

	it('should produce an empty JSON array when no app service variables exist', async () => {
		const serviceName = 'nono';
		api.expectGetService({ serviceName });
		api.expectGetApp();
		api.expectGetAppServiceVars();

		const { out, err } = await runCommand(
			`envs -a ${appName} -s ${serviceName} -j`,
		);

		expect(out.join('')).to.equal('[]\n');
		expect(err.join('')).to.equal('');
	});

	it('should successfully list env and service vars for a test app (--all flag)', async () => {
		api.expectGetApp();
		api.expectGetAppEnvVars();
		api.expectGetAppServiceVars();

		const { out, err } = await runCommand(`envs -a ${appName} --all`);

		expect(out.join('')).to.equal(
			stripIndent`
			ID     NAME  VALUE       APPLICATION SERVICE
			120110 svar1 svar1-value test        service1
			120111 svar2 svar2-value test        service2
			120101 var1  var1-val    test        *
			120102 var2  22          test        *
			` + '\n',
		);
		expect(err.join('')).to.equal('');
	});

	it('should successfully list env and service vars for a test app (--all -s flags)', async () => {
		const serviceName = 'service1';
		api.expectGetService({ serviceName });
		api.expectGetApp();
		api.expectGetAppEnvVars();
		api.expectGetAppServiceVars();

		const { out, err } = await runCommand(
			`envs -a ${appName} --all -s ${serviceName}`,
		);

		expect(out.join('')).to.equal(
			stripIndent`
			ID     NAME  VALUE       APPLICATION SERVICE
			120110 svar1 svar1-value test        ${serviceName}
			120101 var1  var1-val    test        *
			120102 var2  22          test        *
			` + '\n',
		);
		expect(err.join('')).to.equal('');
	});

	it('should successfully list env variables for a test device', async () => {
		api.expectGetDevice({ fullUUID });
		api.expectGetDeviceEnvVars();

		const { out, err } = await runCommand(`envs -d ${shortUUID}`);

		expect(out.join('')).to.equal(
			stripIndent`
			ID     NAME VALUE
			120203 var3 var3-val
			120204 var4 44
			` + '\n',
		);
		expect(err.join('')).to.equal('');
	});

	it('should successfully list env variables for a test device (JSON output)', async () => {
		api.expectGetDevice({ fullUUID });
		api.expectGetDeviceEnvVars();

		const { out, err } = await runCommand(`envs -jd ${shortUUID}`);

		expect(JSON.parse(out.join(''))).to.deep.equal([
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
		]);
		expect(err.join('')).to.equal('');
	});

	it('should successfully list config variables for a test device', async () => {
		api.expectGetDevice({ fullUUID });
		api.expectGetDeviceConfigVars();

		const { out, err } = await runCommand(`envs -d ${shortUUID} --config`);

		expect(out.join('')).to.equal(
			stripIndent`
			ID     NAME                           VALUE
			120400 RESIN_SUPERVISOR_POLL_INTERVAL 900900
			` + '\n',
		);
		expect(err.join('')).to.equal('');
	});

	it('should successfully list service variables for a test device (-s flag)', async () => {
		const serviceName = 'service2';
		api.expectGetService({ serviceName });
		api.expectGetApp();
		api.expectGetDevice({ fullUUID });
		api.expectGetDeviceServiceVars();

		const { out, err } = await runCommand(
			`envs -d ${shortUUID} -s ${serviceName}`,
		);

		expect(out.join('')).to.equal(
			stripIndent`
			ID     NAME  VALUE
			120121 svar4 svar4-value
			` + '\n',
		);
		expect(err.join('')).to.equal('');
	});

	it('should produce an empty JSON array when no device service variables exist', async () => {
		const serviceName = 'nono';
		api.expectGetService({ serviceName });
		api.expectGetApp();
		api.expectGetDevice({ fullUUID });
		api.expectGetDeviceServiceVars();

		const { out, err } = await runCommand(
			`envs -d ${shortUUID} -s ${serviceName} -j`,
		);

		expect(out.join('')).to.equal('[]\n');
		expect(err.join('')).to.equal('');
	});

	it('should successfully list env and service variables for a test device (--all flag)', async () => {
		api.expectGetApp();
		api.expectGetAppEnvVars();
		api.expectGetAppServiceVars();
		api.expectGetDevice({ fullUUID });
		api.expectGetDeviceEnvVars();
		api.expectGetDeviceServiceVars();

		const uuid = shortUUID;
		const { out, err } = await runCommand(`envs -d ${uuid} --all`);

		expect(out.join('')).to.equal(
			stripIndent`
			ID     NAME  VALUE       APPLICATION DEVICE  SERVICE
			120110 svar1 svar1-value test        *       service1
			120111 svar2 svar2-value test        *       service2
			120120 svar3 svar3-value test        ${uuid} service1
			120121 svar4 svar4-value test        ${uuid} service2
			120101 var1  var1-val    test        *       *
			120102 var2  22          test        *       *
			120203 var3  var3-val    test        ${uuid} *
			120204 var4  44          test        ${uuid} *
			` + '\n',
		);
		expect(err.join('')).to.equal('');
	});

	it('should successfully list env and service variables for a test device (unknown app)', async () => {
		api.expectGetDevice({ fullUUID, inaccessibleApp: true });
		api.expectGetDeviceEnvVars();
		api.expectGetDeviceServiceVars();

		const uuid = shortUUID;
		const { out, err } = await runCommand(`envs -d ${uuid} --all`);

		expect(out.join('')).to.equal(
			stripIndent`
			ID     NAME  VALUE       APPLICATION DEVICE  SERVICE
			120120 svar3 svar3-value N/A         ${uuid} service1
			120121 svar4 svar4-value N/A         ${uuid} service2
			120203 var3  var3-val    N/A         ${uuid} *
			120204 var4  44          N/A         ${uuid} *
			` + '\n',
		);
		expect(err.join('')).to.equal('');
	});

	it('should successfully list env and service vars for a test device (--all -s flags)', async () => {
		const serviceName = 'service1';
		api.expectGetService({ serviceName });
		api.expectGetApp();
		api.expectGetAppEnvVars();
		api.expectGetAppServiceVars();
		api.expectGetDevice({ fullUUID });
		api.expectGetDeviceEnvVars();
		api.expectGetDeviceServiceVars();

		const uuid = shortUUID;
		const { out, err } = await runCommand(
			`envs -d ${uuid} --all -s ${serviceName}`,
		);

		expect(out.join('')).to.equal(
			stripIndent`
			ID     NAME  VALUE       APPLICATION DEVICE  SERVICE
			120110 svar1 svar1-value test        *       ${serviceName}
			120120 svar3 svar3-value test        ${uuid} ${serviceName}
			120101 var1  var1-val    test        *       *
			120102 var2  22          test        *       *
			120203 var3  var3-val    test        ${uuid} *
			120204 var4  44          test        ${uuid} *
			` + '\n',
		);
		expect(err.join('')).to.equal('');
	});

	it('should successfully list env and service vars for a test device (--all -js flags)', async () => {
		const serviceName = 'service1';
		api.expectGetService({ serviceName });
		api.expectGetApp();
		api.expectGetAppEnvVars();
		api.expectGetAppServiceVars();
		api.expectGetDevice({ fullUUID });
		api.expectGetDeviceEnvVars();
		api.expectGetDeviceServiceVars();

		const { out, err } = await runCommand(
			`envs -d ${shortUUID} --all -js ${serviceName}`,
		);

		expect(JSON.parse(out.join(''))).to.deep.equal(
			JSON.parse(`[
				{ "id": 120101, "appName": "test", "deviceUUID": "*", "name": "var1", "value": "var1-val", "serviceName": "*" },
				{ "id": 120102, "appName": "test", "deviceUUID": "*", "name": "var2", "value": "22", "serviceName": "*" },
				{ "id": 120110, "appName": "test", "deviceUUID": "*", "name": "svar1", "value": "svar1-value", "serviceName": "${serviceName}" },
				{ "id": 120120, "appName": "test", "deviceUUID": "${fullUUID}", "name": "svar3", "value": "svar3-value", "serviceName": "${serviceName}" },
				{ "id": 120203, "appName": "test", "deviceUUID": "${fullUUID}", "name": "var3", "value": "var3-val", "serviceName": "*" },
				{ "id": 120204, "appName": "test", "deviceUUID": "${fullUUID}", "name": "var4", "value": "44", "serviceName": "*" }
			]`),
		);
		expect(err.join('')).to.equal('');
	});
});
