import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Platform } from "./platform.entity";
import { PlayerMatch } from "./player-match.entity";
import { Scoreboard } from "./scoreboard.entity";

@Entity("matches")
export class Match {
  @PrimaryGeneratedColumn("uuid")
  readonly matchId?: string;

  @Column({ nullable: false, unique: true })
  platformMatchId: string;

  @Column({ nullable: false })
  date: Date;

  @Column({ nullable: false })
  mapName: string;

  @Column({ nullable: false })
  matchUrl: string;

  @ManyToOne(() => Scoreboard, (scoreboard) => scoreboard.matches, {
    onDelete: "SET NULL",
  })
  scoreboard: Scoreboard;

  @ManyToOne(() => Platform, (platform) => platform.matches, {
    onDelete: "SET NULL",
  })
  platform: Platform;

  @ManyToMany(() => PlayerMatch, (playerMatch) => playerMatch.matches, {
    eager: true,
    onDelete: "CASCADE",
  })
  @JoinTable()
  playerMatches: PlayerMatch[];
}