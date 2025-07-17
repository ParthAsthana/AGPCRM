#!/bin/bash
cd frontend
echo "Current directory: $(pwd)"
echo "Installing dependencies..."
npm install --legacy-peer-deps
echo "Building the project..."
npm run build 