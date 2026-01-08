NAME = $(shell jq -r '.name' ./package.json)
VERSION = $(shell jq -r '.version' ./package.json)

# デフォルトのターゲット（makeと入力すると実行される）
make: 
	npm install
	npm run build
	echo "Build completed"
	cp -r dist $(NAME)
	tar -cvzf $(NAME)-$(VERSION).tar.gz $(NAME)
	echo "$(NAME)-$(VERSION).tar.gz  created"
	rm -rf $(NAME)	

.PHONY: dist
dist:
	mv $(NAME)-$(VERSION).tar.gz releases/$(NAME)-$(VERSION).tar.gz
	cp releases/$(NAME)-$(VERSION).tar.gz releases/$(NAME)-latest.tar.gz
	git add releases/$(NAME)-$(VERSION).tar.gz releases/$(NAME)-latest.tar.gz

# クリーンアップターゲット（make cleanで実行される）
clean:
	rm -rf dist node_modules $(NAME) $(NAME)-$(VERSION).tar.gz

