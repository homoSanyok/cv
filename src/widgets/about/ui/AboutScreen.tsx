import { useSettings } from '../../../app/services/settings.service'

const translations = {
  ru: {
    title: 'О себе',
    english: 'Занимаюсь изучением английского языка с репетитором 📖',
    sports: 'Активно занимаюсь спортом 🏋️‍♂️',
    playGame: 'Играть в Silly Witch',
    imageDescription: 'Начальная локация пиксельной игры: комната с деревянным полом, мебелью и корги',
  },
  en: {
    title: 'About me',
    english: 'Studying English with a private tutor 📖',
    sports: 'Actively involved in sports 🏋️‍♂️',
    playGame: 'Play Silly Witch',
    imageDescription: 'The pixel-art game’s starting location: a room with a wooden floor, furniture, and a corgi',
  },
}

export function AboutScreen() {
  const { language } = useSettings()
  const text = translations[language]

  return (
    <section className="cv-screen cv-about" aria-label={text.title}>
      <div className="cv-about__layout">
        <div className="cv-card cv-about__description">
          <ul>
            <li>{text.english}</li>
            <li>
              {language === 'en'
                ? 'Developing my own pixel-art game with '
                : 'Разрабатываю собственную пиксельную игру на '}
              <strong>Pixi.js</strong>{' '}
              🎮
            </li>
            <li>{text.sports}</li>
          </ul>
          <p>
            {language === 'en' ? <>
              On the right is a reference image of the game’s starting location.
              The project architecture follows <strong>Feature-Sliced Design</strong>{' '}
              (FSD) principles and is built exclusively with <strong>Pixi.js</strong>.
            </> : <>
              На изображении представлен референс игры с начальной локацией:
              архитектура проекта построена на принципах{' '}
              <strong>Feature-Sliced Design</strong> с применением исключительно
              библиотеки Pixi.js.
            </>}
          </p>
          <p>
            <a
              href="https://homosanyok.github.io/silly-witch/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ cursor: 'url("assets/design/pointers/Hand (Pointing).svg") 15 12, pointer' }}
            >
              {text.playGame}
            </a>
          </p>
        </div>
        <img
          className="cv-about__game"
          src="assets/cv/game.png"
          alt={text.imageDescription}
        />
      </div>
    </section>
  )
}
