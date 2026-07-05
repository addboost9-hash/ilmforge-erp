#!/bin/bash
echo "Starting IlmForge ERP..."
(cd backend && npm run dev) &
sleep 3
(cd frontend && npm run dev) &
sleep 4
echo "✅ Backend: http://localhost:5000 | Frontend: http://localhost:5173"
wait
