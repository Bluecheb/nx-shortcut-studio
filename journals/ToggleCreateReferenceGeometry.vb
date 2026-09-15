Option Strict Off
Imports System
Imports NXOpen
Imports NXOpen.UF

Module NXShortcutStudioToggleReferenceGeometry
    Sub Main()
        Dim theSession As Session = Session.GetSession()
        Dim prefs As NXOpen.Preferences.SessionSketch = theSession.Preferences.Sketch

        prefs.CreateReferenceGeometry = Not prefs.CreateReferenceGeometry

        Dim state As String = If(prefs.CreateReferenceGeometry, "ON", "OFF")
        UFSession.GetUFSession().Ui.SetStatus(
            "Create Reference Geometry: " & state)
    End Sub

    Public Function GetUnloadOption(ByVal dummy As String) As Integer
        Return Session.LibraryUnloadOption.Immediately
    End Function
End Module
