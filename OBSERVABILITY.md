# Телеметрия воспроизведения

Приложение принимает обезличенные замеры запуска на `POST /api/playback-telemetry` и отдаёт агрегируемые метрики на `GET /metrics`. Названия треков, идентификаторы, URL, токены и заголовки запросов в Prometheus не попадают.

## Запуск

1. Запустить приложение на `localhost:3001` (`npm run dev` или `npm run server`).
2. Запустить наблюдаемость:

   ```powershell
   docker compose -f compose.observability.yml up -d
   ```

3. Открыть Grafana: <http://localhost:3002> (по умолчанию `admin` / `admin`).
4. Открыть папку **YouTube Music Player** и дашборд **Playback telemetry**.

Prometheus доступен на <http://localhost:9090>. Данные хранятся в Docker volumes 30 дней и переживают перезапуск контейнеров. Сменить срок можно через `PROMETHEUS_RETENTION`, порты — через `PROMETHEUS_PORT` и `GRAFANA_PORT`, пароль Grafana — через `GRAFANA_ADMIN_PASSWORD`.

Остановка без удаления данных:

```powershell
docker compose -f compose.observability.yml down
```

Удаление контейнеров вместе с накопленными метриками:

```powershell
docker compose -f compose.observability.yml down -v
```
