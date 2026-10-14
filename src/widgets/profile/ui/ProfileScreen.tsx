import type { CSSProperties } from 'react'
import { useSettings } from '../../../app/services/settings.service'
import './profile.css'

const translations = {
  ru: {
    title: 'Это я',
    portrait: 'Портрет автора резюме',
    fullName: 'Имя:',
    name: 'Генералов Александр',
    age: 'Возраст:',
    education: 'Образование:',
    degree: 'Магистр',
    subject: 'Информатика и вычислительная техника',
    english: 'Английский:',
    phone: 'Телефон:',
    email: 'Почта:',
    thesis: 'Выпускная квалификационная работа:',
    thesisDescription: 'Разработка интеллектуального агента для семантической навигации в веб-интерфейсах с использованием методов дообучения языковых моделей',
  },
  en: {
    title: 'It’s me',
    portrait: 'Portrait of the CV author',
    fullName: 'Full name:',
    name: 'Generalov Aleksandr',
    age: 'Age:',
    education: 'Degree:',
    degree: 'Master of Science in',
    subject: 'Computer Science and Engineering',
    english: 'English:',
    phone: 'Phone:',
    email: 'Email:',
    thesis: 'Master’s thesis:',
    thesisDescription: 'Development of an Intelligent Agent for Semantic Web UI Navigation via Large Language Model Fine-Tuning',
  },
}

export function ProfileScreen() {
  const { language } = useSettings()
  const text = translations[language]

  return (
    <section className="cv-screen cv-profile" aria-label={text.title}>
      <div className="cv-profile__layout">
        <img
          className="cv-profile__portrait"
          src="assets/cv/portrait.png"
          alt={text.portrait}
        />
        <div className="cv-card cv-profile__details">
          <div className="cv-profile__contacts-row">
            <div className="cv-profile__contact-info">
              <dl className="cv-profile__facts">
                <div>
                  <dt>{text.fullName}</dt>
                  <dd>{text.name}</dd>
                </div>
                <div>
                  <dt>{text.age}</dt>
                  <dd>{new Date().getFullYear() - 2002}</dd>
                </div>
              </dl>
              <address className="cv-profile__contacts">
                <div>
                  <strong>{text.phone}</strong>
                  <a
                    href="tel:+79939103962"
                    style={{
                      '--cursor-default': 'url("assets/design/pointers/Hand%20(Pointing).svg") 15 12, pointer',
                    } as CSSProperties}
                  >
                    +7 (993)-910 39 62
                  </a>
                </div>
                <div>
                  <strong>{text.email}</strong>
                  <a
                    href="mailto:sadha.9eneralow@yandex.ru"
                    style={{
                      '--cursor-default': 'url("assets/design/pointers/Hand%20(Pointing).svg") 15 12, pointer',
                    } as CSSProperties}
                  >
                    sadha.9eneralow@yandex.ru
                  </a>
                </div>
              </address>
            </div>
            <div className="cv-profile__social-links">
              <a
                className="cv-profile__external-link"
                href="https://www.linkedin.com/in/homosanyok/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn: homosanyok"
                style={{
                  '--cursor-default': 'url("assets/design/pointers/Hand%20(Pointing).svg") 15 12, pointer',
                } as CSSProperties}
              >
                <img src="assets/cv/linkedin.svg" alt="" />
              </a>
              <a
                className="cv-profile__external-link"
                href="https://t.me/homo_sanyok"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram: homo_sanyok"
                style={{
                  '--cursor-default': 'url("assets/design/pointers/Hand%20(Pointing).svg") 15 12, pointer',
                } as CSSProperties}
              >
                <img src="assets/cv/telegram.svg" alt="" />
              </a>
            </div>
          </div>
          <hr className="cv-profile__divider" />
          <div className="cv-profile__education">
            <div className="cv-profile__education-text">
              <dl className="cv-profile__facts">
                <div>
                  <dt>{text.education}</dt>
                  <dd>{text.degree}</dd>
                </div>
              </dl>
              <dl className="cv-profile__facts">
                <div><dd>{text.subject}</dd></div>
              </dl>
            </div>
            <a
              className="cv-profile__external-link"
              href="https://rosbiotech.ru/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={language === 'ru' ? 'Сайт РОСБИОТЕХ' : 'ROSBIOTECH website'}
              style={{
                '--cursor-default': 'url("assets/design/pointers/Hand%20(Pointing).svg") 15 12, pointer',
              } as CSSProperties}
            >
              <img src="assets/cv/rosbiotech-favicon.svg" alt="" />
            </a>
          </div>
          <dl className="cv-profile__facts">
            <div>
              <dt>{text.english}</dt>
              <dd>B2</dd>
            </div>
          </dl>
        </div>
        <div className="cv-card cv-profile__thesis">
          <div className="cv-profile__thesis-text">
            <h2>{text.thesis}</h2>
            <p>{text.thesisDescription}</p>
          </div>
          <a
            className="cv-profile__external-link"
            href="https://github.com/homoSanyok/anchor-assistant"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub: anchor-assistant"
            style={{
              '--cursor-default': 'url("assets/design/pointers/Hand%20(Pointing).svg") 15 12, pointer',
            } as CSSProperties}
          >
            <img src="assets/cv/github.svg" alt="" />
          </a>
        </div>
      </div>
    </section>
  )
}
