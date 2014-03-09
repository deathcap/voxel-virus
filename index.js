'use strict';

var toWater = require('./example/water.js');

function Virus(game, opts) {
  if (!(this instanceof Virus)) return new Virus(game, opts || {});
  if (opts === undefined) opts = game;
  this.game      = opts.game      || game;
  this.material  = opts.material  || 0;
  this.materialSource = opts.materialSource || 1;
  this.rate      = opts.rate      || 3000;
  this.virulence = opts.virulence || 0.5;
  this.decay     = opts.decay     || 10;
  this.how       = opts.how       || defaultHow;
  this.infected  = [];
  this.elapsed   = 0;
  if (typeof this.material === 'string') {
    this.material = this.game.materials.find(this.material);
  }
  if (typeof this.materialSource === 'string') {
    this.materialSource = this.game.materials.find(this.materialSource);
  }

  if (opts.isWater) 
    toWater(this, this.material);

  this.enable();
}
module.exports = Virus;
module.exports.pluginInfo = {
  loadAfter: ['voxel-fluid'],
  clientOnly: true // TODO: support server-side (need to lookup material)
};

Virus.prototype.enable = function() {
  this.game.on('tick', this.onTick = this.tick.bind(this));

  var self = this;
  this.game.on('setBlock', this.onSetBlock = function(pos, val) {
    if (val === self.materialSource) {
      self.infect(pos, 0, true);
    }
  });

  /*
  if (this.game.plugins) {
    var registry = this.game.plugins.get('voxel-registry');
    var props = registry.getBlockProps('water');
    if (!props) throw new Error('voxel-registry found but no "water" block registered, voxel-fluid plugin missing?');
    props.onUse = function(
  }
  */
};

Virus.prototype.disable = function() {
  this.game.removeListener('tick', this.onTick);
  this.game.removeListener('setBlock', this.onSetBlock);
};


Virus.prototype.infect = function(block, level, skipSetBlock) {
  var game = this.game;
  level = level || 0;
  if (level >= this.decay || !block) return;
  if (this.material !== false && !skipSetBlock) game.setBlock(block, this.material);
  this.infected.push([this.elapsed + this.rate, block, level]);
};

Virus.prototype.around = function(block) {
  var self = this;
  var size = this.game.cubeSize;
  var around = [];
  [
    [0, 1, 0], [0, -1, 0],
    [1, 0, 0], [-1, 0, 0],
    [0, 0, 1], [0, 0, -1],
  ].forEach(function(p) {
    if (Math.random() >= self.virulence) return;
    var b = [block[0] + (p[0] * size), block[1] + (p[1] * size), block[2] + (p[2] * size)];
    if (self.game.getBlock(b) === 0) return;
    around.push(b);
  });
  return around;
};

Virus.prototype.tick = function(dt) {
  var self = this;
  self.infected = self.infected.filter(function(b) {
    if (self.elapsed < b[0]) return true;
    process.nextTick(function() {
      self.how.call(self, b[1], b[2]);
    });
    return false;
  });
  self.elapsed += dt;
};

function defaultHow(block, level) {
  var self = this;
  if (self.decay > 0) level++;
  self.game.setBlock(block, 0);
  self.around(block).forEach(function(b) {
    self.infect(b, level);
  });
}
