/*
 * The Graphic Automation Framework deamon
 * Copyright (C) 2012  Christian Mayer - mail (at) ChristianMayer (dot) de
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#ifndef ASYNCSOCKET_HPP
#define ASYNCSOCKET_HPP

#include <functional>
#include <boost/bind.hpp>
#include <boost/asio.hpp>

/**
 * Asynchronious socket handling.
 * 
 * Use this class if you've got a file descriptor and want to run code once
 * it got new data.
 */
class AsyncSocket
{
  typedef boost::asio::posix::stream_descriptor_service stream_descriptor_service;
  
public:
  /**
   * Constructor.
   * 
   * @param io_service The @p io_service object from BOOST::ASIO.
   * @param fd         The file descriptor to look at.
   * @param callback   The callback function of signature void() that gets 
   *                   called each time new data is available.
   */
  AsyncSocket( boost::asio::io_service& io_service, 
               const stream_descriptor_service::native_handle_type& fd, 
               const std::function<void()>& callback )
  : subscriber_socket( io_service ),
    callback_fb( callback )
  {
    subscriber_socket.assign( fd );
    subscriber_socket.async_read_some( boost::asio::null_buffers(),
                                       boost::bind( &AsyncSocket::handle_read, this,
                                                  boost::asio::placeholders::error ) );
  }
  
private:
  /**
   * The function that gets called by BOOST::ASIO each time new data is 
   * available.
   */
  void handle_read( const boost::system::error_code& error )
  {
    if( !error )
    {
      callback_fb();
      subscriber_socket.async_read_some( boost::asio::null_buffers(),
                                         boost::bind( &AsyncSocket::handle_read, this,
                                                      boost::asio::placeholders::error ) );
    }
  }

  boost::asio::posix::stream_descriptor subscriber_socket;
  std::function<void()> callback_fb;
};

#endif //ASYNCSOCKET_HPP
