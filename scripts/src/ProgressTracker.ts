import { SupportedToken } from "@gearbox-protocol/sdk";
import fs from "fs";
import { readJson, writeJson } from "fs-extra";
import { Logger } from "tslog";

import { Progress } from "./types";

export class ProgressTracker {
  private log: Logger = new Logger();
  private _progress?: Progress;
  private _progressFileName: string;

  public constructor(progressFileName: string) {
    this._progressFileName = progressFileName;
  }

  public async save<
    S extends keyof Progress,
    E extends keyof NonNullable<Progress[S]>,
  >(script: S, entity: E, address: NonNullable<Progress[S]>[E]): Promise<void> {
    const progress = await this.loadProgress();
    if (!progress[script]) {
      progress[script] = {};
    }
    progress[script]![entity] = address;

    await writeJson(this._progressFileName, progress, { spaces: 2 });
  }

  public async get<
    S extends keyof Progress,
    E extends keyof NonNullable<Progress[S]>,
  >(script: S, entity: E): Promise<NonNullable<Progress[S]>[E]> {
    const progress = await this.loadProgress();
    const p = progress[script];
    // @ts-ignore
    return p?.[entity];
  }

  public async getOrThrow<
    S extends keyof Progress,
    E extends keyof NonNullable<Progress[S]>,
  >(script: S, entity: E): Promise<NonNullable<NonNullable<Progress[S]>[E]>> {
    const result = await this.get(script, entity);
    if (!result) {
      throw new Error(`${String(entity)} is undefined in ${script}`);
    }
    return result!;
  }

  public async isDeployNeeded<S extends keyof Progress>(
    script: S,
    entity: keyof NonNullable<Progress[S]>,
  ): Promise<boolean> {
    const addr = await this.get(script, entity);
    if (addr) {
      this.log.warn(`${String(entity)} is already deployed at: ${addr}`);
      return false;
    }
    return true;
  }

  /**
   * Looks up for token symbol in all progress categories
   * @param symbol
   */
  public async getSupportedToken(
    symbol: SupportedToken,
  ): Promise<string | undefined> {
    const progress = await this.loadProgress();
    for (const script of Object.values(progress)) {
      if (symbol in script) {
        return script[symbol];
      }
    }
    return undefined;
  }

  /**
   * Lazily reads current deploy progress from file or returns empty progress
   * @returns
   */
  private async loadProgress(): Promise<Progress> {
    if (!this._progress) {
      if (fs.existsSync(this._progressFileName)) {
        this.log.warn("FOUND FILE WITH PREVIOUS PROGRESS!");
        this._progress = await readJson(this._progressFileName, "utf-8");
      } else {
        this._progress = {};
      }
    }
    return this._progress!;
  }
}
