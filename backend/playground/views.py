from django.shortcuts import render
from django.http import HttpResponse


def calculate():
    """
    A simple view that performs a calculation and returns the result.
    """
    x = 1
    y = 2
    return x + y


def say_hello(request):
    """
    A simple view that renders a template to say hello.
    """
    x = calculate()
    return render(request, 'hello.html', {'name': 'Andrew'})
