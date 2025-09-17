#!/bin/bash

echo "=== Testing Runtime Filtering ==="

BASE_URL="http://localhost:8000"

echo ""
echo "1. Testing 'Under 90 min' filter (0-90)..."
curl -s "${BASE_URL}/movie/discover/?min_runtime=0&max_runtime=90&page=1" \
  -H "Content-Type: application/json" | jq '.results[0:3] | .[] | {title, runtime}'

echo ""
echo "2. Testing '150+' filter (150-999)..."
curl -s "${BASE_URL}/movie/discover/?min_runtime=150&max_runtime=999&page=1" \
  -H "Content-Type: application/json" | jq '.results[0:3] | .[] | {title, runtime}'

echo ""
echo "3. Testing '90-120 min' filter..."
curl -s "${BASE_URL}/movie/discover/?min_runtime=90&max_runtime=120&page=1" \
  -H "Content-Type: application/json" | jq '.results[0:3] | .[] | {title, runtime}'

echo ""
echo "4. Testing no runtime filter..."
curl -s "${BASE_URL}/movie/discover/?page=1" \
  -H "Content-Type: application/json" | jq '.results[0:3] | .[] | {title, runtime}'

echo ""
echo "Done!"