from django.urls import get_resolver
import pprint

urlconf = get_resolver()
# Recursive function to print urls
def print_urls(urlpatterns, prefix=''):
    for entry in urlpatterns:
        if hasattr(entry, 'url_patterns'):
            print_urls(entry.url_patterns, prefix + str(entry.pattern))
        else:
            print(prefix + str(entry.pattern))

print_urls(urlconf.url_patterns)
