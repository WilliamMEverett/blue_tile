var expect = require('chai').expect;
var Player = require('../player');


describe('getDefaultPlayerObject()', function () {
  it('should create a player object', function () {

    let play = Player.getDefaultPlayerObject()

    expect(play.patternRows).to.be.a('array')
    expect(play.patternRows.length).to.be.at.least(1)
    expect(play.patternRows.length).to.be.equal(play.patternRowSize.length)
    expect(play.wallTiles.length).to.be.equal(play.patternRowSize.length)
    expect(play.wallPattern.length).to.be.equal(play.patternRowSize.length)

  });
});

describe('wallRowContainsColor()', function () {
  it('test if player wall row contains a color', function () {

    let play = Player.getDefaultPlayerObject()
    play.wallTiles[0].push({color:'blue'})
    play.wallTiles[0].push({color:'green'})
    play.wallTiles[1].push({color:'red'})
    play.wallTiles[1].push({color:'black'})
    play.wallTiles[4].push({color:'yellow'})

    for (var i=0; i < play.wallTiles.length; i++) {
      expect(play.wallRowContainsColor('white',i)).to.equal(false)
    }
    expect(play.wallRowContainsColor('blue',0)).to.equal(true)
    expect(play.wallRowContainsColor('red',0)).to.equal(false)
    expect(play.wallRowContainsColor('yellow',4)).to.equal(true)
    expect(play.wallRowContainsColor('red',1)).to.equal(true)
    expect(play.wallRowContainsColor('red',2)).to.equal(false)
  });
});
