#!/bin/bash

# Start backend and frontend servers

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js to run the servers."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3 to run the AI components."
    exit 1
fi

# Set environment variables
export NODE_ENV=development
export PORT=3000
export FRONTEND_PORT=8080

# Create logs directory if it doesn't exist
mkdir -p ../logs

# Install dependencies if needed
echo "Checking backend dependencies..."
if [ ! -d "../node_modules" ]; then
    echo "Installing backend dependencies..."
    cd .. && npm install
fi

echo "Checking frontend dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Start backend server
echo "Starting backend server..."
node api/server.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend server started with PID: $BACKEND_PID"

# Start frontend server
echo "Starting frontend server..."
cd frontend && node server.js > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend server started with PID: $FRONTEND_PID"

echo "Servers started successfully!"
echo "Backend running at: http://localhost:3000"
echo "Frontend running at: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop the servers"

# Function to kill processes on exit
function cleanup {
    echo "Stopping servers..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    echo "Servers stopped."
    exit 0
}

# Register the cleanup function for SIGINT (Ctrl+C)
trap cleanup SIGINT

# Keep the script running
while true; do
    sleep 1
done 