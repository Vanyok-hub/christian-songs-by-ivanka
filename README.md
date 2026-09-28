# Christian Songs by Ivanka

Публічна музична сторінка для прослуховування та завантаження авторських пісень. Адміністратор входить через Supabase Auth, завантажує аудіо, редагує назви/описи та текст головної сторінки. Файли пісень зберігаються в Supabase Storage, а код сайту публікується через GitHub Pages.

## Безпека й доступ

- Будь-хто може слухати й завантажувати пісні з публічного bucket `songs`.
- Лише один обліковий запис адміністратора (перевіряється за UUID, не email) може додавати, змінювати й видаляти пісні та редагувати текст сторінки.
- Публічну реєстрацію вимкніть. Створіть єдиний обліковий запис адміністратора вручну в Supabase Dashboard.
- У браузерний `config.js` вноситься тільки Supabase URL і publishable/anon key. Ніколи не додавайте `service_role` key чи пароль до репозиторію.
- Оскільки пісні публічні, кожен, хто має URL аудіофайла, зможе його завантажити.

## Налаштування Supabase

1. Створіть проєкт у Supabase. Безкоштовний план має обмежений обсяг аудіо й трафіку; квоти можуть змінюватися. Перевіряйте використання в панелі Supabase.
2. У **Storage** створіть bucket з назвою `songs`, позначте його **Public**, встановіть обмеження розміру файла до 50 MB і дозвольте лише аудіоформати.
3. У **Authentication → Users** створіть єдиного користувача адміністратора. У налаштуваннях Authentication вимкніть публічну реєстрацію. Пароль задайте у Supabase самостійно й не додавайте його до файлів сайту.
4. Скопіюйте UUID цього користувача з таблиці Users. У `supabase-setup.sql` замініть усі входження `ADMIN_USER_ID` на цей UUID у лапках і виконайте SQL у **SQL Editor**.
5. У налаштуваннях API скопіюйте Project URL і publishable key (або legacy anon key) у `config.js`, а UUID адміністратора введіть у `adminUserId`.
6. Переконайтеся, що для фронтенду використано publishable/anon key. Ключ `service_role` ніколи не можна розміщувати в браузерному коді.

Supabase Auth перевіряє пароль адміністратора, а PostgreSQL RLS і Storage policies обмежують операції лише заданим UUID. Bucket публічний лише для читання файлів; завантаження, редагування і видалення вимагають входу адміністратора.

## Публікація через GitHub Pages

1. Створіть репозиторій `christian-songs-by-ivanka`.
2. Завантажте до кореня репозиторію файли `index.html`, `styles.css`, `app.js`, `config.js` і `supabase-setup.sql`. Не завантажуйте сюди музичні файли.
3. У репозиторії відкрийте **Settings → Pages** і вкажіть публікацію з гілки `main`, папка `/ (root)`.
4. Дочекайтеся розгортання і відкрийте адресу, яку покаже GitHub Pages.

GitHub Pages публікує статичні HTML/CSS/JS-файли. Дані пісень і аудіо доступні сайту через Supabase; самі файли не зберігаються в GitHub.

## Пісні

Підтримуються формати браузера MP3, M4A/AAC, WAV, OGG та FLAC (фактичне відтворення залежить від браузера). Сайт обмежує один файл розміром 50 MB. Завантажуйте лише аудіо, на яке маєте права на публічне поширення.

## Офіційні довідки

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Supabase Auth: вхід за email і паролем](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [Supabase Storage: контроль доступу](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Storage: публічне прослуховування та завантаження](https://supabase.com/docs/guides/storage/serving/downloads)
- [Supabase Pricing](https://supabase.com/pricing)
