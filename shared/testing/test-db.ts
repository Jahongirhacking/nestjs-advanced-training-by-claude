import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Barcha integration/e2e testlar uchun umumiy baza sozlamasi.
 * Har bir test fayli bazani noldan quradi (dropSchema + synchronize),
 * shuning uchun testlar bir-biriga ta'sir qilmaydi.
 */
export function testDbOptions(entities: Function[]): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.TEST_DB_HOST ?? 'localhost',
    port: Number(process.env.TEST_DB_PORT ?? 5433),
    username: process.env.TEST_DB_USER ?? 'training',
    password: process.env.TEST_DB_PASSWORD ?? 'training',
    database: process.env.TEST_DB_NAME ?? 'training_test',
    entities,
    synchronize: true,
    dropSchema: true,
    logging: false,
  };
}
