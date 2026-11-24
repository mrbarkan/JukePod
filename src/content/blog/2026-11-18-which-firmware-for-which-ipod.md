---
title: Which firmware for which iPod
date: 2026-11-18
kind: Guide
art: ipods
summary: A short guide to choosing custom firmware by iPod model, from the 3rd generation to the Classic.
---

The right firmware depends first on which iPod you have. Find yours below. If you aren't sure of the model, the number printed on the back (it starts with an A) will tell you.

## iPod Classic and iPod Video

These two have the most choice, because nearly every active project targets them.

Start with [Rockbox](/firmware/rockbox/). It installs alongside Apple's firmware, plays FLAC and Opus, and puts the bootloader in place that everything else here needs. Many people stop there.

From Rockbox you can move to a fork by unzipping it over the top, with no reformat and no lost music:

- **[Rockpod](/firmware/rockpod/)** if you own a DAC, dock or speaker that takes digital audio from the dock connector. It also has a rewritten Cover Flow and colors drawn from your album art. Digital audio is for the Classic.
- **[PodBox](/firmware/podbox/)** if you want album covers and artist photos beside every list, audiobook and podcast tracking, listening stats and click-wheel games.
- **[Apple2026 UI](/firmware/rockpod-apple2026/)** if you want a modern Apple-style look and don't mind an experimental beta. It's for the Classic, with partial support for the Video.
- **[RPod](/firmware/rpod/)** for a modernized Rockbox with its own theme on the Classic.

[RodBox](/firmware/rodbox/) is for people comfortable building from source. It has no download yet.

Two newer projects for the iPod Video install their own way instead of over Rockbox, and replace its interface with one modeled on Apple's:

- **[RockWheel](/firmware/rockwheel/)** if you want to keep syncing with Finder or iTunes. A Mac and Windows app installs and updates it, and it adds Cover Flow, lyrics and dark themes. The iPod Photo is in beta.
- **[ProkBox5g](/firmware/prokbox5g/)** if you'd rather drag music on and off with no sync app. It also plays audiobooks and converted video. It's an early pre-release, tested on one modded iPod so far.

## iPod 3rd gen, 4th gen, Photo, mini, nano 1st and 2nd gen

[Rockbox](/firmware/rockbox/) is the one to install. It supports all of these, and it's stable. On the iPod Photo, [RockWheel](/firmware/rockwheel/) is a newer option in beta.

[iPodLinux](/firmware/ipodlinux/) also ran on several of them, but it's no longer developed. It's listed for collectors.

## iPod nano 3rd, 4th and 5th gen

Nothing on the shelves runs on these yet. A library app such as [iOpenPod](/apps/iopenpod/) can still manage their music without iTunes.

## iPod nano 6th and 7th gen

There's no player firmware for these. [ipod_sun](/firmware/ipod-sun/) gets code running on them, which is the first step, but it's a tool for developers and a bad payload can brick the iPod.

## Before you install anything

- Back up your music.
- Turn on disk use for the iPod in Finder or iTunes. Most installs need it.
- Read the install steps on the firmware's page here, then the project's own notes.

A flash storage swap or a bigger battery changes a few firmware settings. The [hardware mods](/mods/) page lists them.
