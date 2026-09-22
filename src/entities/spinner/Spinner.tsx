import './Spinner.css'

export function Spinner() {
  return (
    <div className="spinner" role="status" aria-label="Загрузка страницы">
      <img
        className="spinner__icon"
        src="assets/favicon.svg"
        alt=""
        width="80"
        height="80"
      />
      <img
        className="spinner__spinner"
        src="assets/design/spinner.svg"
        alt=""
        width="28"
        height="28"
      />
    </div>
  )
}
