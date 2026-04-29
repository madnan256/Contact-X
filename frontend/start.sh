#!/bin/bash
cd /home/runner/workspace/server/ContactsX.Api && API_PORT=3001 dotnet run --no-build &
DOTNET_PID=$!
cd /home/runner/workspace && npm run dev &
VITE_PID=$!
wait $DOTNET_PID $VITE_PID
