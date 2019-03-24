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

describe('deepCopy()', function () {
  it('test if deep copy returns a copy unconnected to original', function () {

    let play = Player.getDefaultPlayerObject()
    play.wallTiles[0].push({color:'blue'})
    play.wallTiles[0].push({color:'green'})
    play.wallTiles[1].push({color:'red'})
    play.wallTiles[1].push({color:'black'})
    play.wallTiles[4].push({color:'yellow'})
    play.patternRows[0].push({color:'green'})
    play.patternRows[0].push({color:'green'})
    play.patternRows[1].push({color:'red'})
    play.patternRows[1].push({color:'yellow'})
    play.patternRows[4].push({color:'black'})
    play.discardLine.push({color:'red'})
    play.discardLine.push({color:'green'})
    play.discardLine.push({color:'green'})
    play.playerNumber = 2
    play.score = 50

    let copyPlay = play.deepCopy()

    expect(play.playerNumber).to.equal(copyPlay.playerNumber)
    expect(play.score).to.equal(copyPlay.score)

    expect(play.patternRows.length).to.equal(copyPlay.patternRows.length)
    for (var i=0; i < play.patternRows.length; i++) {
      expect(play.patternRows[i].length).to.equal(copyPlay.patternRows[i].length)
      for (var j=0; j < play.patternRows[i].length; j++) {
        expect(play.patternRows[i][j].color).to.equal(copyPlay.patternRows[i][j].color)
      }
    }
    expect(play.wallTiles.length).to.equal(copyPlay.wallTiles.length)
    for (var i=0; i < play.wallTiles.length; i++) {
      expect(play.wallTiles[i].length).to.equal(copyPlay.wallTiles[i].length)
      for (var j=0; j < play.wallTiles[i].length; j++) {
        expect(play.wallTiles[i][j].color).to.equal(copyPlay.wallTiles[i][j].color)
      }
    }
    expect(play.discardLine.length).to.equal(copyPlay.discardLine.length)
    for (var i=0; i < play.discardLine.length; i++) {
      expect(play.discardLine[i].color).to.equal(copyPlay.discardLine[i].color)
    }

    copyPlay.score = 65
    copyPlay.playerNumber = 1
    copyPlay.discardLine.pop()
    copyPlay.discardLine.pop()
    copyPlay.wallTiles[3].push({color:'white'})
    copyPlay.wallTiles[0].pop()
    copyPlay.patternRows[0].pop()
    copyPlay.patternRows[0].pop()
    copyPlay.patternRows[0].push({color:'blue'})
    copyPlay.patternRows[0].push({color:'blue'})
    copyPlay.patternRows[1].push({color:'blue'})

    expect(play.playerNumber).to.not.equal(copyPlay.playerNumber)
    expect(play.score).to.not.equal(copyPlay.score)
    expect(play.discardLine.length).to.not.equal(copyPlay.discardLine.length)
    expect(play.wallTiles[3].length).to.not.equal(copyPlay.wallTiles[3].length)
    expect(play.wallTiles[0].length).to.not.equal(copyPlay.wallTiles[0].length)
    expect(play.patternRows[1].length).to.not.equal(copyPlay.patternRows[1].length)
    expect(play.patternRows[0][0].color).to.not.equal(copyPlay.patternRows[0][0].color)

  });
});
