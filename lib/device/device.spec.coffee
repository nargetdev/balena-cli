expect = require('chai').expect
device = require('./device')

describe 'Device:', ->

	describe '#getDisplayName()', ->

		it 'should return Raspberry Pi for that device', ->
			possibleNames = [
				'raspberry-pi'
				'raspberrypi'
				'rpi'
			]

			for name in possibleNames
				expect(device.getDisplayName(name)).to.equal('Raspberry Pi')

		it 'should return unknown if no matches', ->
			unknownNames = [
				'hello'
				'foobar'
				{}
				123
			]

			for name in unknownNames
				expect(device.getDisplayName(name)).to.equal('Unknown')