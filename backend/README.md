# Backend Django pour l'interface Invest

Ce dossier contient un backend Django REST minimal destiné à servir l'application frontend du dépôt.

Démarrage rapide (Windows PowerShell) :

```powershell
# créer et activer un environnement virtuel
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# appliquer les migrations et créer un superutilisateur
python manage.py migrate
python manage.py createsuperuser

# lancer le serveur de développement
python manage.py runserver 8000
```

Exemples d'endpoints API :
- `POST /api/auth/token/` -> obtenir un JWT (username + password)
- `POST /api/auth/token/refresh/` -> rafraîchir le JWT
- `GET /api/market-offers/` -> lister les offres de marché
- `GET /api/wallets/` -> (authentifié) lister les portefeuilles de l'utilisateur

Remarques :
- Ce projet utilise SQLite par défaut pour la simplicité. En production, utilisez Postgres ou une autre base adaptée.
- `CORS_ALLOW_ALL_ORIGINS` est activé pour le développement ; restreignez-le en production.

Frontend connection notes:
- The frontend reads `VITE_API_BASE_URL` (e.g. `http://localhost:8000/api`). A sample `.env.local` is included in `frontend/`.
- The backend sets an httpOnly cookie named `refresh` on login/register; the frontend uses `POST /auth/refresh` (with credentials) to obtain a new access token. Ensure `axios` calls are made with `withCredentials: true` (already configured in `frontend/src/services/api.ts`).

Start both apps (PowerShell):
```powershell
# backend
cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8000

# frontend (new terminal)
cd frontend
npm install
npm run dev
```
