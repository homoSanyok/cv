import { useSettings } from '../../../app/services/settings.service'

const translations = {
  ru: {
    title: 'Это я',
    portrait: 'Портрет автора резюме',
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
      <div className="cv-profile__overview">
        <img
          className="cv-profile__portrait"
          src="assets/cv/portrait.png"
          alt={text.portrait}
        />
        <div className="cv-card cv-profile__details">
          <dl className="cv-profile__facts">
            <div>
              <dt>{text.age}</dt>
              <dd>24</dd>
            </div>
            <div>
              <dt>{text.education}</dt>
              <dd>{text.degree}</dd>
            </div>
          </dl>
          <p>{text.subject}</p>
          <dl className="cv-profile__facts">
            <div>
              <dt>{text.english}</dt>
              <dd>B2</dd>
            </div>
          </dl>
          <address className="cv-profile__contacts">
            <div>
              <strong>{text.phone}</strong>
              <a href="tel:+79939103962">+7 (993)-910 39 62</a>
            </div>
            <div>
              <strong>{text.email}</strong>
              <a href="mailto:sadha.9eneralow@yandex.ru">
                sadha.9eneralow@yandex.ru
              </a>
            </div>
          </address>
        </div>
      </div>
      <div className="cv-card cv-profile__thesis">
        <h2>{text.thesis}</h2>
        <p>{text.thesisDescription}</p>
      </div>
    </section>
  )
}
