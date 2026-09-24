#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Список защищённых паттернов
PROTECTED_PATTERNS=(".env" ".env.local" "prisma/migrations" "package-lock.json")

for PATTERN in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$PATTERN"* ]]; then
    echo "Заблокировано: $FILE_PATH является защищённым файлом." >&2
    echo "Добавьте переменную вручную в терминале." >&2
    exit 2
  fi
done

exit 0