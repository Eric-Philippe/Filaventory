.PHONY: swagger build run

swagger:
	~/go/bin/swag init -g main.go --parseInternal

build: swagger
	go build -o bin/server .

run: swagger
	go run .
