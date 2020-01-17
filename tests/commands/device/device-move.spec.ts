import { expect } from 'chai';
import { BalenaAPIMock } from '../../balena-api-mock';
import { cleanOutput, runCommand } from '../../helpers';

const HELP_RESPONSE = `
Usage: device move <uuid>

Use this command to move a device to another application you own.

If you omit the application, you'll get asked for it interactively.

Examples:

\t$ balena device move 7cf02a6
\t$ balena device move 7cf02a6 --application MyNewApp

Options:

    --application, -a, --app <application> application name
`;

describe('balena device move', function() {
	let api: BalenaAPIMock;

	beforeEach(() => {
		api = new BalenaAPIMock();
	});

	afterEach(() => {
		// Check all expected api calls have been made and clean up.
		api.done();
	});

	it('should print help text with the -h flag', async () => {
		api.expectGetWhoAmI({ optional: true });
		api.expectGetMixpanel({ optional: true });

		const { out, err } = await runCommand('device move -h');

		expect(cleanOutput(out)).to.deep.equal(cleanOutput([HELP_RESPONSE]));

		expect(err).to.eql([]);
	});

	it.skip('should error if uuid not provided', async () => {
		// TODO: Figure out how to test for expected errors with current setup
		//  including exit codes if possible.
		api.expectGetWhoAmI({ optional: true });
		api.expectGetMixpanel({ optional: true });

		const { out, err } = await runCommand('device move');
		const errLines = cleanOutput(err);

		expect(errLines[0]).to.equal('Missing uuid');
		expect(out).to.eql([]);
	});

	// TODO: Test to add once nock matching issues resolved:
	//  - 'should perform device move if application name provided'
	//  - 'should start interactive selection of application name if none provided'
	//  - 'correctly handles devices with missing application'
});
