# System Scope and Context

The explainer's actor, besides the generic ones.

## Learner's own AI assistant

The explainer's optional tutor is this assistant, which the learner brings and controls; no model runs in the
browser. After the learner's click, the app hands it the current task through the tutor prompt and the static tutor
files.

```arc42
:::actor
id: actor-learner-assistant
title: Learner's own AI assistant
type: system
description: Receives the task through the tutor prompt and the tutor files after the learner's click
requires: if-tutor-files
:::
```

## YouTube

A video block's player comes from YouTube's privacy-enhanced host, youtube-nocookie.com, and only after the
learner's click on "Video abspielen", or once they chose "Videos immer direkt laden" (`dec-explainer-video-two-click`).
Before that the page requests nothing from YouTube or Google; the video is a link to its page on youtube.com.

```arc42
:::actor
id: actor-youtube
title: YouTube
type: system
description: Serves a video's player into the page, only after the learner's click or standing choice
requires: if-video-player
:::
```
