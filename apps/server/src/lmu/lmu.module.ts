import { Inject, Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { LmuAdapter } from './lmu-adapter.js'
import { LMU_ADAPTER } from './lmu.constants.js'
import { MockLmuAdapter } from './mock/mock-lmu.adapter.js'
import { RestLmuAdapter } from './rest/rest-lmu.adapter.js'

function selectAdapter(): LmuAdapter {
  return process.env.LMU_ADAPTER === 'rest' ? new RestLmuAdapter() : new MockLmuAdapter()
}

@Module({
  providers: [{ provide: LMU_ADAPTER, useFactory: selectAdapter }],
  exports: [LMU_ADAPTER],
})
export class LmuModule implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(LMU_ADAPTER) private readonly adapter: LmuAdapter) {}

  async onModuleInit(): Promise<void> {
    await this.adapter.connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.adapter.disconnect()
  }
}
