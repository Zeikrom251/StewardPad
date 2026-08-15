import { Module } from '@nestjs/common'
import { LmuModule } from '../lmu/lmu.module.js'
import { PersistenceModule } from '../persistence/persistence.module.js'
import { ConfigController } from './config.controller.js'
import { ConfigService } from './config.service.js'

@Module({
  imports: [LmuModule, PersistenceModule],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
