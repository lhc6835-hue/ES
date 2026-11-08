# 이모지 샌드박스 (Emoji Sandbox)

이모지를 꺼내서 놓으면 저마다 성격대로 움직이고 서로 부딪치는 샌드박스 게임.

- **플레이**: `npm install && npm run build` 후 `dist/index.html`을 브라우저로 열기 (파일 하나로 동작)
- **개발**: `npm run dev`로 루트를 띄우고 `index.html` 열기

## 조작
- 빈 곳을 탭/클릭 → 선택한 이모지 소환 (💧🔥⚡🧽는 꾹 누르고 그으면 계속)
- 이모지를 잡고 끌었다 놓으면 던지기 → 벽·바닥·다른 이모지에 부딪혀 튕김
- PC: `1~8` 선택, `Q/E` 탭 전환, `Space` 일시정지

## 이모지
| 생물 | 자연 | 물건 |
|---|---|---|
| 🏃 사람 · 🦖 공룡 · 🧟 좀비 · 🐔 닭 · 🐕 강아지 · 🦸 히어로 · 👻 유령 · 🐝 벌 | 🔥 불 · 💧 물 · 🌱 새싹 · 🧊 얼음 · ⚡ 번개 · 🍎 사과 | 💣 폭탄 · 🪨 바위 · 🎈 풍선 · 🌀 블랙홀 · 🥚 달걀 · 🧽 지우개 |

변신해서 생기는 것: 🌳 나무, 🐣 병아리, 🍗 치킨, 🍳 계란후라이, 💀 해골

## 구조
- `src/game.js` 이모지 특성, 물리(원형 충돌·쌓기·구르기), 상호작용
- `src/render.js` 이모지 → 도트 스프라이트, 배경, pixelfx 연결
- `src/main.js` 루프, 입력, 툴바
- `vendor/pixelfx` 픽셀 이펙트 ([patch-gg/pixelfx](https://github.com/patch-gg/pixelfx), MIT). `cartoon-pow.js`에 `scale`, `big` 옵션 추가
- 폰트: Galmuri (OFL, `assets/GALMURI-OFL.md`)
