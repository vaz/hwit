require 'bundler'
require 'json'

ENV['RACK_ENV'] ||= 'development'
Bundler.require :default, ENV['RACK_ENV'].to_sym

set :sprockets, Sprockets::Environment.new
set :assets_prefix, '/assets'
set :digest_assets, true

Dir['assets/*'].each { |path| settings.sprockets.append_path path }

Sprockets::Helpers.configure do |config|
  config.environment = settings.sprockets
  config.prefix = settings.assets_prefix
  config.digest = settings.digest_assets
  config.public_path = settings.public_dir
end

configure do
  set :db, Redis.new
end

helpers do
  include Sprockets::Helpers

  def text_id(text)
    "#{text['x']}-#{text['y']}"
  end
end

get '/' do
  slim :index
end

before %r{/texts(/.*)?} do
  content_type 'application/json'
end

get '/texts' do
  ids = settings.db.smembers "texts:collection"
  texts = settings.db.pipelined do
    ids.each { |id| settings.db.hgetall(id) }
  end
  texts.to_json
end

post '/texts' do
  request.body.rewind
  text = JSON.parse(request.body.read)
  id = text_id(text)
  text['id'] = id
  settings.db.mapped_hmset "texts:#{id}", text
  settings.db.sadd "texts:collection", "texts:#{id}"
  text.to_json
end

get '/texts/:id' do |id|
  settings.db.hgetall "texts:#{id}"
end

put '/texts/:id' do |id|
  return 404 unless settings.db.sismember('texts:collection', "texts:#{id}")
  request.body.rewind
  text = JSON.parse(request.body.read)
  settings.db.mapped_hmset "texts:#{id}", text
  text.to_json
end

patch '/texts/:id' do |id|
  return 404 unless settings.db.sismember('texts:collection', "texts:#{id}")
  request.body.rewind
  text_patch = JSON.parse(request.body.read)
  text = settings.db.hgetall("texts:#{id}")
  text.merge! text_patch
  settings.db.mapped_hmset "texts:#{id}", text
  text.to_json
end

delete '/texts/:id' do |id|
  settings.db.srem('texts:collection', "texts:#{id}") ? 200 : 404
end
