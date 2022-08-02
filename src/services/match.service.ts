import { Request } from "express";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { Match, Platform, Scoreboard } from "../entities";
import { Multikill } from "../entities/multikill.entity";
import { PlatformCredentials } from "../entities/platform-credentials";
import { PlayerMatch } from "../entities/player-match.entity";
import { Player } from "../entities/player.entity";
import { PlatformNames } from "../enums";
import { IScoreboard } from "../interfaces/matches";
import { PlayerRepository } from "../repositories";

import { Playwright } from "../utils/playwright";
import { CSGOStats } from "./platform";

class MatchService {
  private playwright = Playwright;
  private platformService = CSGOStats;

  getOrCreatePlatform = async (
    name: PlatformNames,
    entityManager: EntityManager
  ) => {
    let platform = await entityManager.findOneBy(Platform, { name });

    if (!platform) {
      platform = await entityManager.save(Platform, { name });
    }

    return platform;
  };

  getOrCreateScoreboard = async (
    scoreboardInfo: IScoreboard,
    entityManager: EntityManager
  ) => {
    let scoreboard = await entityManager.findOneBy(Scoreboard, scoreboardInfo);

    if (!scoreboard) {
      scoreboard = await entityManager.save(Scoreboard, scoreboardInfo);
    }

    return scoreboard;
  };

  insertMatch = async ({ body }: Request) => {
    const { url } = body;

    const page = await this.playwright.launchPage(url);

    const matchInfo = await this.platformService.matchInfo(page, url);

    const match = await AppDataSource.transaction(async (entityManager) => {
      const platform = await this.getOrCreatePlatform(
        matchInfo.match.platform,
        entityManager
      );

      const scoreboard = await this.getOrCreateScoreboard(
        matchInfo.match.scoreboard,
        entityManager
      );

      const matchStatsInfo = {
        ...matchInfo.match,
        platform: undefined,
        scoreboard: undefined,
        playerMatches: [],
      };

      const players = [...matchInfo.team_1, ...matchInfo.team_2];

      const playerMatchesArray = Promise.all(
        // TODO change these teams to one player array
        players.map(async (playerDetails) => {
          const player = await PlayerRepository.findOne(
            playerDetails.playerInfo.platformPlayerId
          );

          if (!player) return undefined;

          const multikill = await entityManager.save(
            Multikill,
            playerDetails.matchStats.multikill
          );

          const playerMatches = entityManager.create(PlayerMatch, {
            ...playerDetails.matchStats,
            multikill: undefined,
          });

          playerMatches.multikill = multikill;
          playerMatches.player = player;

          return await entityManager.save(PlayerMatch, playerMatches);
        })
      );

      const playerMatches = (await playerMatchesArray).filter(
        (player) => player
      ) as PlayerMatch[];

      const match = entityManager.create(Match, matchStatsInfo);

      match.platform = platform;
      match.scoreboard = scoreboard;
      match.playerMatches = playerMatches;

      return await entityManager.save(Match, match);
    });

    await this.playwright.close();

    return { status: 200, message: match };
  };
}

export default new MatchService();