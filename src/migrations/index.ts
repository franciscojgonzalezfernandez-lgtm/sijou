import * as migration_20261123_214301_initial from './20261123_214301_initial';

export const migrations = [
  {
    up: migration_20261123_214301_initial.up,
    down: migration_20261123_214301_initial.down,
    name: '20261123_214301_initial'
  },
];
