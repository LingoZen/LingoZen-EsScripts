echo "Starting Scrape"
cd ./scrapper/
node ./main
cd ../
echo "Finished Scrape"

echo "Starting Trans"
node ./translate-origin-json-to-translation-json
echo "Finished Trans"
