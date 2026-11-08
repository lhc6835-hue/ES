# emojibox · 이모지 샌드박스

이모지를 꺼내서 놓으면 저마다 성격대로 움직이고 서로 부딪치는 샌드박스 게임.

- **바로 플레이**: https://lhc6835-hue.github.io/ES/
- **직접 빌드**: `npm install && npm run build` 후 `dist/index.html`을 브라우저로 열기 (파일 하나로 동작)
- **개발**: `npm run dev`로 루트를 띄우고 `index.html` 열기

## 화면
- **메인 화면**: 픽셀 로고 아래에서 이모지가 쏟아지는 데모가 실제 물리로 돌아가요
- **새 맵**: 이름, 비율(16:9 · 21:9 · 3:2 · 4:3 · 1:1 · 3:4 · 9:16), 크기(작게~아주 크게), 테마(낮 · 노을 · 밤)
- **내 맵**: 저장한 맵을 썸네일로 보고, 눌러서 이어 하거나 🗑️로 지우기 (브라우저에 저장)
- **게임 안**: ☰ 메뉴 · 💾 저장 · 📐 비율·크기 바꾸기
- 화면이 바뀔 때 이모지 타일이 대각선으로 덮였다 걷혀요

## 조작
- 빈 곳을 탭/클릭 → 선택한 이모지 소환 (💧🔥⚡🧽는 꾹 누르고 그으면 계속)
- 이모지를 잡고 끌었다 놓으면 던지기 → 벽·바닥·다른 이모지에 부딪혀 튕김
- PC: `1~8` 선택, `Q/E` 탭 전환, `Space` 일시정지

## 이모지 (51종)
| 탭 | 이모지 |
|---|---|
| 사람 | 🏃 사람 · 👶 아기 · 🦸 히어로 · 🧙 마법사 · 🤖 로봇 · 🧟 좀비 · 👻 유령 |
| 동물 | 🦖 공룡 · 🐉 드래곤 · 🐔 닭 · 🐕 강아지 · 🐈 고양이 · 🐁 쥐 · 🐸 개구리 · 🐟 물고기 · 🐄 소 · 🐧 펭귄 · 🐒 원숭이 · 🐌 달팽이 · 🐝 벌 |
| 자연 | 🔥 불 · 💧 물 · ❄️ 눈 · 🌱 새싹 · 🌵 선인장 · 🍄 버섯 · 🧊 얼음 · 🌋 화산 |
| 날씨·재해 | ⚡ 번개 · ☁️ 비구름 · ⛈️ 번개구름 · 🌪️ 회오리 · ☄️ 운석 · 🛸 UFO · 🌀 블랙홀 |
| 음식 | 🍎 사과 · 🍌 바나나 · 🧀 치즈 · 🍕 피자 · 🥚 달걀 |
| 물건 | 💣 폭탄 · 🚀 로켓 · 🪨 바위 · 🧱 벽돌 · 📦 상자 · 🏀 공 · 🎈 풍선 · 🎁 선물 · 🧲 자석 · 💩 똥 |
| 도구 | 🧽 지우개 · 💖 치료 · 🔨 망치 · 💨 바람 |

변신해서 생기는 것: 🌳 나무, 🐣 병아리, 🍗 치킨, 🍳 계란후라이, 🍣 초밥, 💀 해골

## 소리 (전부 CC0)
- **브금**: [Open Lo-Fi](https://github.com/btahir/open-lofi)의 로파이 4곡. 메인 화면, 낮·노을·밤 맵마다 다른 곡이 흐르고 화면을 바꾸면 자연스럽게 넘어가요
- **효과음**: [Kenney](https://kenney.nl) Impact · Interface · Sci-Fi · Digital Audio 팩과 OpenGameArt CC0 팩(Juhani Junkala 512 Retro, RPG Sound Pack, 37 Hits/Punches, Zombies, Level-Up) 중 48가지 107개
- 목록과 원본 파일 이름: `assets/audio/sfx/CREDITS.md`, `assets/audio/music/CREDITS.md`
- 메인 화면 오른쪽 위 🎵 🔊, 게임 안에서는 ☰ 메뉴에서 켜고 끌 수 있어요

## 구조
- `src/game.js` 처음 이모지들, 물리(원형 충돌·쌓기·구르기), 상호작용
- `src/more.js` 추가 이모지, 탭 구성, 도구
- `src/render.js` 이모지 → 도트 스프라이트, 배경, pixelfx 연결
- `src/main.js` 루프, 입력, 툴바, 화면 이동
- `src/app.js` 로고, 화면 전환, 맵 저장
- `src/audio.js` 효과음(WebAudio)과 배경음
- `vendor/pixelfx` 픽셀 이펙트 ([patch-gg/pixelfx](https://github.com/patch-gg/pixelfx), MIT). `cartoon-pow.js`에 `scale`, `big` 옵션 추가
- 폰트: Galmuri (OFL, `assets/GALMURI-OFL.md`)
