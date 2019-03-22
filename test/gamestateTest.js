var expect = require('chai').expect;
var GameState = require('../gamestate');


describe('getDefaultGameState()', function () {
  it('should create a gamestate object', function () {

    let gs = GameState.getDefaultGameState()

    expect(gs.tileArray).to.be.a('array')
    expect(gs.discardedTiles).to.be.a('array')
    expect(gs.factoryDisplays).to.be.a('array')
    expect(gs.centerDisplay).to.be.a('array')
    expect(gs.players).to.be.a('array')



    // expect(play.patternRows.length).to.be.at.least(1)
    // expect(play.patternRows.length).to.be.equal(play.patternRowSize.length)
    // expect(play.wallTiles.length).to.be.equal(play.patternRowSize.length)
    // expect(play.wallPattern.length).to.be.equal(play.patternRowSize.length)

  });
});

describe('winningPlayers()', function () {
  it('should accurately determine who the winning players are', function () {

    let gs = GameState.getDefaultGameState()

    var player1 = {score:47,numberOfCompletedRows: function() { return 1},playerNumber:0}
    var player2 = {score:35,numberOfCompletedRows: function() { return 0},playerNumber:1}
    var player3 = {score:46,numberOfCompletedRows: function() { return 2},playerNumber:2}
    var player4 = {score:40,numberOfCompletedRows: function() { return 1},playerNumber:3}

    gs.players.push(player1)
    gs.players.push(player2)
    gs.players.push(player3)
    gs.players.push(player4)

    var result = gs.winningPlayers()
    expect(result).to.be.a('array')
    expect(result.length).to.be.equal(1)
    expect(result[0].playerNumber).to.be.equal(0)

    gs.players[1].score = 49

    result = gs.winningPlayers()
    expect(result).to.be.a('array')
    expect(result.length).to.be.equal(1)
    expect(result[0].playerNumber).to.be.equal(1)

    gs.players[1].score = 40
    gs.players[3].score = 47

    result = gs.winningPlayers()
    expect(result).to.be.a('array')
    expect(result.length).to.be.equal(2)
    expect(result[0].playerNumber).to.be.equal(0)
    expect(result[1].playerNumber).to.be.equal(3)

  });
});
