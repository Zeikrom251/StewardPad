import 'reflect-metadata'
import './load-env.js'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'

const PORT = Number(process.env.PORT ?? 3000)

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  await app.listen(PORT)
  new Logger('bootstrap').log(`StewardPad backend listening on http://localhost:${PORT}`)
}

function isPortTaken(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error.code === 'EADDRINUSE'
  )
}

bootstrap().catch((error: unknown) => {
  const log = new Logger('bootstrap')
  if (isPortTaken(error)) {
    // A steward seeing this mid-race needs the fix, not a Node stack trace.
    log.error(
      `Port ${PORT} is already in use — StewardPad is probably already running. ` +
        `Close the other window, or start this one with a different port: PORT=3001 pnpm dev`,
    )
    process.exit(1)
  }
  log.error('StewardPad backend failed to start', error)
  process.exit(1)
})
