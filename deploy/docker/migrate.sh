#!/bin/sh
# Migracje schematu (idempotentne; Prisma trzyma blokadę doradczą w bazie,
# więc równoległe uruchomienie z kilku podów jest bezpieczne).
set -eu
exec node /opt/prisma/node_modules/prisma/build/index.js migrate deploy --schema /app/prisma/schema.prisma
