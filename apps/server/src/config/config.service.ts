import { Inject, Injectable } from '@nestjs/common'
import { Subject } from 'rxjs'
import type { AppConfig, UpdateConfigInput } from '@stewardpad/shared'
import { PersistenceService } from '../persistence/persistence.service.js'
import { ARCHIVE_DIR } from '../persistence/persisted-state.js'
import type { LmuAdapter } from '../lmu/lmu-adapter.js'
import { LMU_ADAPTER } from '../lmu/lmu.constants.js'

@Injectable()
export class ConfigService {
  private readonly changes = new Subject<AppConfig>()
  readonly changes$ = this.changes.asObservable()

  constructor(
    private readonly persistenceService: PersistenceService,
    @Inject(LMU_ADAPTER) private readonly adapter: LmuAdapter,
  ) {}

  get(): AppConfig {
    const config = this.persistenceService.getConfig()
    return {
      ...config,
      adapter: this.adapter.name,
      // Resolve null/'' to the default so the client always sees an absolute path.
      archiveDir: config.archiveDir || ARCHIVE_DIR,
    }
  }

  update(input: UpdateConfigInput): AppConfig {
    this.persistenceService.updateConfig(input)
    const config = this.get()
    this.changes.next(config)
    return config
  }
}
