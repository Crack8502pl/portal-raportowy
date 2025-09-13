# Portal Raportowy - Employee Report Management System

Portal Raportowy to nowoczesny system zarządzania raportami pracowniczymi, zaprojektowany z myślą o efektywności i bezpieczeństwie. System umożliwia tworzenie, edycję, archiwizowanie i eksportowanie raportów pracy z funkcjami współpracy zespołowej.

## 🚀 Funkcjonalności

### 🔐 System Autentykacji
- Logowanie z trzema rolami: **Pracownik**, **Koordynator**, **Administrator**
- JWT authentication z automatycznym odświeżaniem sesji
- Zarządzanie hasłami przez administratora
- Bezpieczne przechowywanie danych uwierzytelniających

### 📝 Zarządzanie Raportami
- **Tworzenie raportów** z intuicyjnym formularzem
- **Wersjonowanie** - automatyczne tworzenie wersji V1, V2, V3... przy edycji
- **Walidacja danych** - limity 300 znaków, sprawdzanie typów plików
- **Załączniki** - obsługa zdjęć i dokumentów (JPG, PNG, PDF, DOC, XLS)
- **Współpracownicy** - dodawanie pracowników z godzinami pracy
- **Email notifications** - automatyczne powiadomienia o nowych raportach

### 👥 Zarządzanie Pracownikami
- Dodawanie i edycja profili pracowników
- Historia pracy i uczestnictwa w raportach
- Wyszukiwanie i filtrowanie
- Import/eksport danych

### 📊 Zaawansowane Raportowanie
- **Export do Excel** z formatowaniem
- **Hurtowy eksport** z filtrami (data, autor, status)
- **Statystyki** i podsumowania dla koordynatorów
- **Panel administracyjny** z metrykami systemu

### 🔒 Bezpieczeństwo
- **Sanityzacja danych** - ochrona przed XSS
- **Walidacja plików** - sprawdzanie typu i rozmiaru
- **Rate limiting** - ograniczenia zapytań
- **CORS configuration** - bezpieczne połączenia
- **bcrypt** - szyfrowanie haseł

## 🛠️ Technologie

### Backend
- **Node.js** + **Express.js**
- **PostgreSQL** - relacyjna baza danych
- **JWT** - autentykacja
- **Multer** - obsługa plików
- **Nodemailer** - wysyłanie emaili
- **ExcelJS** - generowanie raportów Excel
- **bcrypt** - szyfrowanie haseł

### Frontend
- **Vanilla JavaScript** - bez frameworków
- **Responsive CSS** - nowoczesny design
- **Gradientowe tła** - inspirowane der-mag.pl
- **Dynamiczne walidacje** - liczniki znaków
- **Modal dialogs** - intuicyjne interfejsy

### Deployment
- **Docker** + **Docker Compose**
- **Nginx** - reverse proxy
- **PM2** - process manager
- **SSL/TLS** ready

## 📋 Wymagania Systemowe

- **Node.js** 18.x lub nowszy
- **PostgreSQL** 12.x lub nowszy
- **Docker** (opcjonalnie)
- **Nginx** (dla produkcji)

## 🚀 Instalacja i Uruchomienie

### 1. Klonowanie Repozytorium
```bash
git clone https://github.com/Crack8502pl/portal-raportowy.git
cd portal-raportowy
```

### 2. Konfiguracja Środowiska
```bash
# Skopiuj przykładową konfigurację
cp config/.env.example config/.env

# Edytuj konfigurację według potrzeb
nano config/.env
```

### 3. Uruchomienie z Docker (Zalecane)
```bash
# Uruchom wszystkie usługi
docker-compose up -d

# Sprawdź logi
docker-compose logs -f app

# Aplikacja będzie dostępna pod: http://localhost:3000
```

### 4. Instalacja Manualna

#### Backend
```bash
# Zainstaluj zależności
npm install
npm run install-backend

# Zainicjalizuj bazę danych
npm run init-db

# Uruchom serwer
npm run dev
```

#### Baza Danych
```bash
# Zaloguj się do PostgreSQL
psql -U postgres

# Utwórz bazę danych
CREATE DATABASE portal_raportowy;

# Wykonaj skrypt inicjalizacyjny
\i database/init.sql
```

## 👤 Domyślne Konta

Po inicjalizacji bazy danych dostępne są następujące konta testowe:

| Rola | Login | Hasło | Opis |
|------|-------|--------|------|
| **Administrator** | `admin` | `admin123` | Pełne uprawnienia systemu |
| **Koordynator** | `coordinator` | `coord123` | Zarządzanie raportami i pracownikami |
| **Pracownik** | `employee` | `emp123` | Tworzenie własnych raportów |

## 📁 Struktura Projektu

```
portal-raportowy/
├── backend/                 # Serwer API
│   ├── config/             # Konfiguracja (baza, auth, email)
│   ├── controllers/        # Logika biznesowa
│   ├── middleware/         # Walidacja, auth, upload
│   ├── models/             # Modele danych
│   ├── routes/             # Endpointy API
│   ├── utils/              # Narzędzia (email, Excel, sanitizer)
│   └── server.js           # Główny plik serwera
├── frontend/               # Aplikacja kliencka
│   ├── css/                # Style CSS
│   ├── js/                 # JavaScript modules
│   ├── pages/              # Strony HTML
│   └── index.html          # Główna strona
├── database/               # Schema i migracje
│   └── init.sql            # Inicjalizacja bazy
├── config/                 # Konfiguracja deployment
│   ├── .env.example        # Przykładowe zmienne środowiskowe
│   ├── nginx.conf          # Konfiguracja Nginx
│   └── ecosystem.config.js # PM2 configuration
└── docker-compose.yml     # Docker services
```

## 🔧 Konfiguracja

### Zmienne Środowiskowe (.env)
```env
# Baza danych
DB_HOST=localhost
DB_PORT=5432
DB_NAME=portal_raportowy
DB_USER=postgres
DB_PASSWORD=admin

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@portal-raportowy.com

# Serwer
PORT=3000
NODE_ENV=production
MAX_FILE_SIZE=10485760
```

### Konfiguracja Email
System obsługuje wysyłanie powiadomień email. Skonfiguruj SMTP w pliku `.env`:

1. **Gmail**: Użyj App Passwords
2. **Outlook**: Konfiguruj SMTP settings
3. **Custom SMTP**: Podaj dane serwera

## 📊 Funkcjonalności według Roli

### 👤 Pracownik
- ✅ Tworzenie nowych raportów
- ✅ Edycja własnych raportów (szkice)
- ✅ Przeglądanie historii własnych raportów
- ✅ Dodawanie załączników do raportów
- ✅ Eksport własnych raportów do Excel

### 👥 Koordynator
- ✅ Wszystkie funkcje pracownika
- ✅ Przeglądanie wszystkich raportów
- ✅ Zarządzanie pracownikami
- ✅ Zaawansowany eksport raportów
- ✅ Statystyki i podsumowania
- ✅ Archiwizacja raportów

### 🔧 Administrator
- ✅ Wszystkie funkcje koordynatora
- ✅ Zarządzanie użytkownikami
- ✅ Zmiana haseł użytkowników
- ✅ Aktywacja/deaktywacja kont
- ✅ Panel administracyjny systemu
- ✅ Konfiguracja email i systemu

## 🛡️ Bezpieczeństwo

### Zaimplementowane Zabezpieczenia
- **Input Sanitization** - DOMPurify + validator.js
- **File Upload Security** - walidacja typu, rozmiaru i zawartości plików
- **Rate Limiting** - ograniczenia dla API i logowania
- **CORS Policy** - kontrola dostępu między domenami
- **Password Security** - bcrypt z salt rounds 12
- **JWT Security** - podpisywanie i weryfikacja tokenów
- **SQL Injection Protection** - parametryzowane zapytania
- **XSS Protection** - sanityzacja HTML i JavaScript

### Zalecenia Produkcyjne
- Zmień domyślne hasła i JWT_SECRET
- Skonfiguruj HTTPS z certyfikatami SSL
- Używaj silnych haseł dla bazy danych
- Regularnie aktualizuj zależności
- Monitoruj logi systemowe
- Wykonuj regularne kopie zapasowe

## 📈 Monitoring i Logi

### Health Check
```bash
# Sprawdzenie statusu aplikacji
curl http://localhost:3000/api/health
```

### Logi Docker
```bash
# Logi aplikacji
docker-compose logs -f app

# Logi bazy danych  
docker-compose logs -f postgres

# Logi Nginx
docker-compose logs -f nginx
```

### PM2 Monitoring
```bash
# Status procesów
pm2 status

# Logi w czasie rzeczywistym
pm2 logs

# Monitoring zasobów
pm2 monit
```

## 🔄 Backup i Przywracanie

### Backup Bazy Danych
```bash
# Backup
docker exec portal-raportowy-db pg_dump -U postgres portal_raportowy > backup.sql

# Restore
docker exec -i portal-raportowy-db psql -U postgres -d portal_raportowy < backup.sql
```

### Backup Plików
```bash
# Backup uploads
tar -czf uploads-backup.tar.gz backend/uploads/

# Restore uploads
tar -xzf uploads-backup.tar.gz
```

## 🚀 Deployment na Produkcję

### 1. Przygotowanie Serwera (Ubuntu 22.04 LTS)
```bash
# Aktualizacja systemu
sudo apt update && sudo apt upgrade -y

# Instalacja Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalacja Docker Compose
sudo apt install docker-compose-plugin

# Instalacja Nginx (jeśli nie używasz Docker)
sudo apt install nginx
```

### 2. Deployment z Docker
```bash
# Sklonuj repozytorium
git clone https://github.com/Crack8502pl/portal-raportowy.git
cd portal-raportowy

# Skonfiguruj środowisko produkcyjne
cp config/.env.example config/.env
nano config/.env

# Uruchom w trybie produkcyjnym
docker-compose --profile production up -d
```

### 3. Deployment z PM2
```bash
# Zainstaluj PM2 globalnie
npm install -g pm2

# Zainstaluj zależności
npm install
npm run install-backend

# Zainicjalizuj bazę danych
npm run init-db

# Uruchom z PM2
pm2 start config/ecosystem.config.js --env production

# Zapisz konfigurację PM2
pm2 save
pm2 startup
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/login` - Logowanie
- `POST /api/auth/logout` - Wylogowanie
- `GET /api/auth/profile` - Profil użytkownika
- `PUT /api/auth/profile` - Aktualizacja profilu

### Reports
- `GET /api/reports` - Lista raportów
- `POST /api/reports` - Nowy raport
- `GET /api/reports/:id` - Szczegóły raportu
- `PUT /api/reports/:id` - Aktualizacja raportu
- `DELETE /api/reports/:id` - Usunięcie raportu
- `GET /api/reports/:id/export` - Eksport do Excel

### Employees
- `GET /api/employees` - Lista pracowników
- `POST /api/employees` - Nowy pracownik
- `PUT /api/employees/:id` - Aktualizacja pracownika
- `GET /api/employees/:id/work-history` - Historia pracy

### Users (Admin)
- `GET /api/users` - Lista użytkowników
- `POST /api/users` - Nowy użytkownik
- `PUT /api/users/:id` - Aktualizacja użytkownika
- `POST /api/users/:id/change-password` - Zmiana hasła

## 🤝 Wsparcie

### Dokumentacja API
Pełna dokumentacja API dostępna pod: `http://localhost:3000/api/docs`

### Wsparcie Techniczne
- **GitHub Issues**: [github.com/Crack8502pl/portal-raportowy/issues](https://github.com/Crack8502pl/portal-raportowy/issues)
- **Email**: support@portal-raportowy.com

### Rozwój
Projekt jest open-source. Zapraszamy do współpracy:
1. Fork repozytorium
2. Utwórz branch funkcjonalności
3. Wyślij Pull Request

## 📄 Licencja

MIT License - see [LICENSE](LICENSE) file for details.

---

**Portal Raportowy** - Nowoczesny system zarządzania raportami pracowniczymi 🚀