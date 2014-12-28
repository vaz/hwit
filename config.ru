require_relative 'app'
map('/assets') { run Sinatra::Application.sprockets }
run Sinatra::Application
