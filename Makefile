partmaker.fma: clean *.html js/*.js css/*.css icon.png package.json
	zip touchandgo.fma *.html js/*.js css/*.css icon.png package.json

.PHONY: clean

clean:
	rm -rf example.fma
