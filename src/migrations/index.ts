import * as migration_20261123_214301_initial from './20261123_214301_initial';
import * as migration_20261124_021434_products from './20261124_021434_products';

export const migrations = [
  {
    up: migration_20261123_214301_initial.up,
    down: migration_20261123_214301_initial.down,
    name: '20261123_214301_initial',
  },
  {
    up: migration_20261124_021434_products.up,
    down: migration_20261124_021434_products.down,
    name: '20261124_021434_products'
  },
];
