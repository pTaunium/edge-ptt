const getRealUrl = (pathname: string, search: string): string => {
  if (pathname.startsWith('/~static')) {
    return `https://images.ptt.cc${pathname.replace('/~static', '')}${search}`;
  } else if (pathname.startsWith('/~cache')) {
    return `https://cache.ptt.cc${pathname.replace('/~cache', '')}${search}`;
  }

  return `https://www.ptt.cc${pathname}${search}`;
}


export const handleRequest = async (request: Request): Promise<Response> => {
  const { protocol, host, pathname, search } = new URL(request.url);

  if (request.method !== 'GET') {
    if (pathname === '/ask/over18') {
      const formdata = await request.formData();
      const target = formdata.get('yes') ==='yes'
        ? (formdata.get('from') as string) || '/'
        : '/';

      return new Response(null, {
        status: 302,
        headers: {
          Location: target,
          'Set-Cookie': 'over18=1; path=/;'
        },
      });
    }

    return new Response(`Method ${request.method} not allowed.`, {
      status: 405,
      headers: {
        Allow: "GET",
      },
    });
  }

  const url = getRealUrl(pathname, search);

  // Drop some headers
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!['host', 'referer'].includes(key.toLowerCase())) {
      headers.append(key, value);
    }
  });

  const resp = await fetch(url, {
    method: 'GET',
    headers,
  });

  const content_type = resp.headers.get('content-type') || '';
  if (
    content_type.startsWith('text')
    || /application\/(json|javascript)/.test(content_type)
  ) {
    // For text response
    let text = await resp.text();
    text = text.replaceAll('https://www.ptt.cc', `${protocol}//${host}`);
    text = text.replaceAll('//images.ptt.cc', '/~static');
    text = text.replaceAll('https://cache.ptt.cc', '/~cache');

    // Edit domain of Set-Cookie
    const headers = new Headers();
    resp.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        headers.append(key, value.replace('domain=.ptt.cc', ''));
      } else {
        headers.append(key, value);
      }
    });

    return new Response(text, {
      headers,
      status: resp.status,
      statusText: resp.statusText,
    });
  }

  return resp;
};
