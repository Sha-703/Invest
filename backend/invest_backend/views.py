from django.template.response import TemplateResponse


def custom_404(request, exception=None):
    """Custom handler for missing routes.

    Note: the user requested a 402 status for missing routes. Returning HTTP 402
    for compatibility with their frontend expectation. If you prefer standard
    404, change status=404 below.
    """
    context = {
        'path': request.path,
        'message': "La route demandée est introuvable.",
    }
    return TemplateResponse(request, '402.html', context=context, status=402)


def custom_404_standard(request, exception=None):
    context = {
        'path': request.path,
        'message': "La route demandée est introuvable.",
    }
    return TemplateResponse(request, '404.html', context=context, status=404)
