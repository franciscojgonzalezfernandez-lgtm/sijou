import * as migration_20261123_214301_initial from './20261123_214301_initial';
import * as migration_20261124_021434_products from './20261124_021434_products';
import * as migration_20261126_213452_variants_gallery from './20261126_213452_variants_gallery';
import * as migration_20261126_213645_media_thumbnail from './20261126_213645_media_thumbnail';
import * as migration_20261127_114944_settings_audit from './20261127_114944_settings_audit';
import * as migration_20261127_123512_categories_collections from './20261127_123512_categories_collections';
import * as migration_20261128_113103_stock_lots from './20261128_113103_stock_lots';

export const migrations = [
  {
    up: migration_20261123_214301_initial.up,
    down: migration_20261123_214301_initial.down,
    name: '20261123_214301_initial',
  },
  {
    up: migration_20261124_021434_products.up,
    down: migration_20261124_021434_products.down,
    name: '20261124_021434_products',
  },
  {
    up: migration_20261126_213452_variants_gallery.up,
    down: migration_20261126_213452_variants_gallery.down,
    name: '20261126_213452_variants_gallery',
  },
  {
    up: migration_20261126_213645_media_thumbnail.up,
    down: migration_20261126_213645_media_thumbnail.down,
    name: '20261126_213645_media_thumbnail',
  },
  {
    up: migration_20261127_114944_settings_audit.up,
    down: migration_20261127_114944_settings_audit.down,
    name: '20261127_114944_settings_audit',
  },
  {
    up: migration_20261127_123512_categories_collections.up,
    down: migration_20261127_123512_categories_collections.down,
    name: '20261127_123512_categories_collections',
  },
  {
    up: migration_20261128_113103_stock_lots.up,
    down: migration_20261128_113103_stock_lots.down,
    name: '20261128_113103_stock_lots'
  },
];
