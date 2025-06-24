const registrationPage = document.getElementById('registration');
const editButton = document.querySelector('.button-edit');
const profileBtnDelete = document.querySelector('.profile-delete-button');
const homePage = document.getElementById('home');
const profilePage = document.getElementById('profile');
const matchPage = document.getElementById('match');
const termsPage = document.getElementById('terms-of-use');
const confirmButton = document.querySelector('.confirm-button');
const footer = document.querySelector('footer');

const facultySelect = document.querySelector('.profile-form__select');
const aboutTextarea = document.getElementById('about');
const charCount = document.getElementById('char-count');
const profileConfirmButton = document.querySelector('.profile .confirm-button');
const profileTitle = document.querySelector('.profile-item__subtitle');
const nameInputContainer = document.querySelector('.name-input');
const nameInput = document.getElementById('name');

function updateCharCount() {
    const maxLength = aboutTextarea.getAttribute('maxlength');
    const remainingChars = maxLength - aboutTextarea.value.length;
    charCount.textContent = remainingChars;
}

window.addEventListener('DOMContentLoaded', () => {
    updateCharCount(); 
});

let userData = {
    name: "",
    telegram_id: null,
    username: null,
    faculty_id: null,
    about: "",
    avatar: "",
    isFirstVisit: true,
};

const socket = io();

async function checkFirstVisit(telegram_id) {
    try {
        const response = await fetch(`/api/check-user/${telegram_id}`);
        const data = await response.json();
        return data.isFirstVisit;
    } catch (error) {
        console.error("Ошибка проверки пользователя:", error);
        return true;
    }
}

// get user data from Telegram API
function getTelegramData() {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        const tgData = window.Telegram.WebApp.initDataUnsafe.user;
        currentUserId = tgData.id;
        tgUsername = tgData.username; 

        return {
            name: tgData.first_name || "",
            telegram_id: tgData.id,
            username: tgData.username = tgUsername || 'не указан',
            avatar: tgData.photo_url || "",
        };
    }
    console.error("Не удалось получить данные Telegram.");
    return null;
}

function populateProfileForm(data) {
    if (data.faculty_id) {
        facultySelect.value = data.faculty_id;
    }
    if (data.about) {
        aboutTextarea.value = data.about;
        charCount.textContent = data.about.length;
        updateCharCount();
    }
}

confirmButton.addEventListener('click', () => {
    if (userData.isFirstVisit) {
        goToPage('profile');
    } else {
        alert('Вы уже заполнили профиль.');
        goToPage('home');
    }
});

// page display
function goToPage(page) {
    document.querySelectorAll('.page').forEach(pageElement => pageElement.style.display = 'none');
    document.querySelectorAll('.footer-button .icon').forEach(icon => icon.classList.remove('active'));

    switch (page) {
        case 'home':
            homePage.style.display = 'flex';
            footer.style.display = 'flex';
            document.querySelector('#homeBtn .icon').classList.add('active');
            // Сброс уведомлений для раздела Home
            resetNotifications('home');
            break;
        case 'match':
            matchPage.style.display = 'block';
            footer.style.display = 'flex';
            document.querySelector('#matchBtn .icon').classList.add('active');
            // Сброс уведомлений для раздела Matches
            resetNotifications('match');
            // Загрузка мэтчей при переходе на страницу "match"
            loadMatches();
            break;
        case 'profile':
            profilePage.style.display = 'block';
            editButton.style.display = userData.isFirstVisit ? 'none' : 'block';
            footer.style.display = userData.isFirstVisit ? 'none' : 'flex';
            profileBtnDelete.style.display = userData.isFirstVisit ? 'none' : 'block';
            nameInputContainer.style.display = userData.isFirstVisit ? 'none' : 'flex';
            document.querySelector('#profileBtn .icon').classList.add('active');
            updateUserProfile();
            break;
        case 'terms':
            termsPage.style.display = 'block';
            break;
        case 'registration':
            registrationPage.style.display = 'block';
            footer.style.display = 'none';
            break;
    }
}

facultySelect.addEventListener('change', (event) => {
    userData.faculty_id = event.target.value;
    validateProfileForm();  
});

aboutTextarea.addEventListener('input', () => {
    updateCharCount(); 
    validateProfileForm();
});

aboutTextarea.addEventListener('keydown', function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
    }
});

function validateProfileForm() {
    const isNameFilled = nameInput.value.trim().length > 0;
    const isFacultySelected = facultySelect.value !== '0';
    const isAboutFilled = aboutTextarea.value.trim().length > 0;
    profileConfirmButton.disabled = !(isNameFilled && isFacultySelected && isAboutFilled);
}

function resetNotifications(type) {
    // type может быть 'home' или 'match'
    fetch('/api/reset-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_id: userData.telegram_id,
        type: type
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log(`Уведомления для ${type} сброшены`);
        // Если у вас есть badge-элемент (например, с id 'homeBadge' или 'matchBadge'),
        // скрываем его:
        const badge = document.getElementById(`${type}Badge`);
        if (badge) {
          badge.style.display = 'none';
        }
      } else {
        console.error(`Ошибка сброса уведомлений для ${type}:`, data.error);
      }
    })
    .catch(err => {
      console.error('Ошибка при сбросе уведомлений:', err);
    });
  }
  
  async function loadNotifications() {
    if (!userData.telegram_id) return;
    
    // Если пользователь только первый раз зашел, не отображаем индикаторы
    if (userData.isFirstVisit) {
      const matchBadge = document.getElementById('matchBadge');
      const homeBadge = document.getElementById('homeBadge');
      if (matchBadge) matchBadge.style.display = 'none';
      if (homeBadge) homeBadge.style.display = 'none';
      return;
    }
    
    try {
      const response = await fetch(`/api/get-notifications/${userData.telegram_id}`);
      const notifications = await response.json();
      
      // Обновляем badge для Matches
      const matchBadge = document.getElementById('matchBadge');
      if (matchBadge) {
        if (notifications.match && Number(notifications.match) > 0) {
          matchBadge.style.display = 'block';
        } else {
          matchBadge.style.display = 'none';
        }
      }
      
      // Обновляем badge для Home (если используется)
      const homeBadge = document.getElementById('homeBadge');
      if (homeBadge) {
        if (notifications.home && Number(notifications.home) > 0) {
          homeBadge.style.display = 'block';
        } else {
          homeBadge.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  }

function updateProfilePage(data) {
    document.querySelector('.profile-item__img').src = data.avatar || 'assets/img/user-avatar.jpg';
}

function updateHomePage(data) {
    document.querySelector('.main-card__top-title').textContent = data.name || 'Имя не указано';
    document.querySelector('.main-card__top-subtitle').textContent = data.faculty_name || 'Факультет не указан';
    document.querySelector('.main-card__img').src = data.avatar || 'assets/img/user-avatar.jpg';
    document.querySelector('.main-card__bottom-text').textContent = data.about || 'Информация отсутствует';
}

profileConfirmButton.addEventListener('click', async () => {
    const nameInput = document.getElementById('name');
    userData.name = nameInput.value.trim();

    if (!userData.name) {
        alert('Имя не может быть пустым!');
        return;
    }

    if (!profileConfirmButton.disabled) {
        userData.faculty_id = facultySelect.value;
        userData.about = aboutTextarea.value.trim();
        userData.username = tgUsername; 

        console.log('Отправляемые данные:', userData); 
        try {
            const response = await fetch('/api/save-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            if (response.ok) {
                const updatedUserData = await response.json();
                userData.isFirstVisit = false;
                userData = { ...userData, ...updatedUserData };
                updateProfilePage(userData);
                alert('Профиль успешно сохранен!');
                goToPage('home');
            } else {
                alert('Ошибка сохранения профиля!');
            }
        } catch (error) {
            console.error('Ошибка сохранения профиля:', error);
            alert('Ошибка сохранения профиля!');
        }
    }
});

let facultyMap = {};
async function loadFaculties() {
    try {
        const response = await fetch('/api/faculties');
        const faculties = await response.json();

        facultyMap = faculties.reduce((map, faculty) => {
            map[faculty.id] = faculty.name;
            return map;
        }, {});
    } catch (error) {
        console.error('Ошибка загрузки факультетов:', error);
    }
}

loadFaculties();

// get user profile from db
async function getUserProfile(telegram_id) {
    try {
        const response = await fetch(`/api/get-user-profile/${telegram_id}`);
        const data = await response.json();

        if (data) {
            userData.faculty_name = data.faculty_name || 'Факультет не указан';
            populateProfileForm(data);
        }
        return data;
    } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
        return null;
    }
}

function setNameInput(data) {
    const nameInput = document.getElementById('name');
    nameInput.value = data.name || '';
}

async function updateUserProfile() {
    const telegramData = getTelegramData();

    if (telegramData) {
        userData = {
            ...userData,
            name: telegramData.name,
            telegram_id: telegramData.telegram_id,
            avatar: telegramData.avatar,
        };

        const userProfile = await getUserProfile(userData.telegram_id);

        if (userProfile) {
            userData.name = userProfile.name || userData.name;
            userData.avatar = userProfile.avatar || userData.avatar;
            userData.faculty_id = userProfile.faculty_id || userData.faculty_id;
            userData.about = userProfile.about || userData.about;

            setNameInput(userData);
            updateProfilePage(userData);
        }
    }
}

// Initilization the app
(async function initializeApp() {
    const telegramData = getTelegramData();

    if (telegramData) {
        userData = {
            ...userData,
            name: telegramData.name,
            telegram_id: telegramData.telegram_id,
            avatar: telegramData.avatar,
        };

        const isFirstVisit = await checkFirstVisit(userData.telegram_id);
        userData.isFirstVisit = isFirstVisit;

        if (isFirstVisit) {
            goToPage('registration');
        } else {
            await updateUserProfile();
            goToPage('home');
        }
    } else {
        console.error('Не удалось получить данные Telegram.');
        alert('Ошибка загрузки данных Telegram.');
    }
})();

// footer buttons
document.getElementById('homeBtn').addEventListener('click', () => goToPage('home'));
document.getElementById('matchBtn').addEventListener('click', () => goToPage('match'));
document.getElementById('profileBtn').addEventListener('click', () => goToPage('profile'));

updateUserProfile();

// DOM elements
const deleteButton = document.querySelector('.profile-delete-button');
const popup = document.querySelector('.popup');
const overlay = document.querySelector('.overlay');
const confirmDeleteButton = document.querySelector('.popup-button.confirm');
const cancelDeleteButton = document.querySelector('.popup-button.cancel');

// popup
const closePopup = () => {
    popup.classList.remove('active');
    overlay.classList.remove('active');
};

deleteButton.addEventListener('click', () => {
    popup.classList.add('active');
    overlay.classList.add('active');
});

cancelDeleteButton.addEventListener('click', closePopup);
overlay.addEventListener('click', closePopup);
// 

function resetProfileForm() {
    facultySelect.value = '0';
    aboutTextarea.value = '';
    charCount.textContent = '0';
    validateProfileForm(); 
}

confirmDeleteButton.addEventListener('click', async () => {
    const telegramId = window.Telegram.WebApp.initDataUnsafe.user?.id;

    if (!telegramId) {
        alert('Ошибка: Telegram ID не найден. Попробуйте авторизоваться повторно.');
        closePopup();
        return;
    }

    try {
        const response = await fetch('/api/delete-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ telegram_id: telegramId }), 
        });

        const result = await response.json();

        if (result.success) {
            alert('Ваш профиль был успешно удален.');
            closePopup();
            userData = { isFirstVisit: true };
            resetProfileForm(); 
            location.reload(); 
        } else {
            alert('Ошибка: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка при удалении профиля:', error);
        alert('Не удалось удалить профиль. Попробуйте позже.');
    }
});

let currentViewedUserId = null;

async function fetchRandomUser(addToViewed = false) {
    try {
        const response = await fetch('/api/get-random-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: userData.telegram_id }),
        });

        const user = await response.json();

        if (user) {
            updateHomePage(user);
            document.querySelector('.no-users-message').style.display = 'none';
            document.querySelector('.main-card').style.display = 'block';

            currentViewedUserId = user.telegram_id;

            if (addToViewed) {
                await markAsViewed(currentViewedUserId);
            }
        } else {
            document.querySelector('.no-users-message').style.display = 'block';
            document.querySelector('.main-card').style.display = 'none';
            document.querySelector('.main-buttons').style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка получения случайного пользователя:', error);
    }
}

async function markAsViewed(userId) {
    try {
        await fetch('/api/mark-viewed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: userData.telegram_id,
                viewed_user_id: userId,
            }),
        });
    } catch (error) {
        console.error('Ошибка при пометке пользователя как просмотренного:', error);
    }
}

// async function resetViews() {
//     try {
//         const response = await fetch('/api/reset-views', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ telegram_id: userData.telegram_id }),
//         });

//         const result = await response.json();
//         if (result.message) {
//             console.log(result.message);
//             await fetchRandomUser();
//         }
//     } catch (error) {
//         console.error('Ошибка сброса просмотров:', error);
//     }
// }

// Обработчик кнопки сброса просмотров
// document.querySelector('.button-reset').addEventListener('click', () => {
//     resetViews();
//     location.reload(); 
// });

// like and dislike buttons
document.querySelector('.button-cancel').addEventListener('click', async () => {
    await markAsViewed(currentViewedUserId);
    fetchRandomUser();
});

document.querySelector('.button-like').addEventListener('click', async () => {
    if (!currentViewedUserId) {
        console.error('Ошибка: currentViewedUserId не определён.');
        alert('Произошла ошибка, попробуйте снова.');
        return;
    }
    try {
        const response = await fetch('/api/like-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fromUserId: userData.telegram_id,
                toUserId: currentViewedUserId, 
            }),
        });

        if (!response.ok) {
            throw new Error('Ошибка при отправке лайка');
        }

        const result = await response.json();

        await markAsViewed(currentViewedUserId);
        fetchRandomUser();
    } catch (error) {
        console.error('Ошибка обработки лайка:', error);
        alert('Произошла ошибка, попробуйте снова.');
    }
});


async function loadMatches() {
    if (!userData.telegram_id) {
        console.error("loadMatches: telegram_id не определён");
        return;
    }
    try {
        const response = await fetch(`/api/get-matches/${userData.telegram_id}`);
        const matches = await response.json();

        const matchContainer = document.querySelector('.match-content');
        matchContainer.innerHTML = '';

        if (!matches || matches.length === 0) {
            matchContainer.innerHTML = '<p>У вас пока нет мэтчей 😢</p>';
            return;
        }

        matches.forEach(match => {
            const matchCard = document.createElement('div');
            matchCard.classList.add('match-card');

            matchCard.innerHTML = `
                <div class="match-card__left">
                    <img class="match-img" src="${match.avatar || 'assets/img/user-avatar.jpg'}" alt="avatar">
                    <div class="match-text">
                        <p class="match-title">${match.name}</p>
                        <p class="match-subtitle">@${match.username || 'не указан'}</p>
                    </div>
                </div>
                <button class="message-button" data-username="${match.username}">
                    <img class="match-icon" src="assets/svg/message.svg" alt="message">
                </button>
            `;

            matchCard.querySelector('.message-button').addEventListener('click', () => {
                window.location.href = `https://t.me/${match.username}`;
            });

            matchContainer.appendChild(matchCard);
        });
    } catch (error) {
        console.error('Ошибка загрузки мэтчей:', error);
        const matchContainer = document.querySelector('.match-content');
        matchContainer.innerHTML = '<p>Произошла ошибка при загрузке мэтчей. Попробуйте позже.</p>';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await updateUserProfile();
    await loadMatches();
    fetchRandomUser();

    // Регистрируем пользователя в сокете, если telegram_id определён
    if (userData && userData.telegram_id) {
        socket.emit('register', { telegram_id: userData.telegram_id });
    }

    // Если пользователь не на первом входе, загружаем уведомления с сервера
    if (!userData.isFirstVisit) {
        loadNotifications();
    }

    // При получении push-уведомления о новом мэтче, обновляем уведомления с сервера
    socket.on('new_match', (data) => {
        alert(data.message);
        loadMatches();
        loadNotifications();
    });
});


const avatarInput = document.getElementById('avatarInput');
const buttonEdit = document.querySelector('.button-edit');
const profileImg = document.querySelector('.profile-item__img');

buttonEdit.addEventListener('click', () => avatarInput.click());

avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

    if (!file) {
        return;
    }

    if (!allowedTypes.includes(file.type)) {
        alert('Неверный формат файла. Допустимы только изображения JPG, PNG, GIF.');
        return;
    }

    const maxSizeInBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
        alert('Размер файла слишком большой. Допустимы файлы до 5MB.');
        return;
    }

        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('telegram_id', userData.telegram_id);

        try {
            const response = await fetch('/api/upload-avatar', { 
                method: 'POST', 
                body: formData 
            })

            if (response.ok) {
                const data = await response.json();
                profileImg.src = `${window.location.origin}${data.avatarUrl}?t=${Date.now()}`; // Обновляем изображение и предотвращаем кэширование
                userData.avatar = data.avatarUrl;
                alert('Фото успешно обновлено!');
            } else {
                const error = await response.json();
                alert(`Ошибка: ${error.message || 'Не удалось загрузить фото.'}`);
            }
        } catch (error) {
            console.error('Ошибка загрузки фото:', error);
            alert('Не удалось загрузить фото. Попробуйте позже.');
        }
    });

// textarea keys
aboutTextarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault(); 
      const cursorPos = aboutTextarea.selectionStart; 
      const textBefore = aboutTextarea.value.substring(0, cursorPos); 
      const textAfter = aboutTextarea.value.substring(cursorPos);
  
      aboutTextarea.value = `${textBefore}\n\n${textAfter}`;
      aboutTextarea.selectionEnd = cursorPos + 1; 
    }
  });
  
  aboutTextarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      aboutTextarea.blur(); 
    }
  });

  function reloadPage() {
    location.reload();
}