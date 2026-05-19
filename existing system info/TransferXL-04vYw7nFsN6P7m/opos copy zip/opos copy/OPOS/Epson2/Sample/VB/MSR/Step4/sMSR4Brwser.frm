VERSION 5.00
Object = "{EAB22AC0-30C1-11CF-A7EB-0000C05BAE0B}#1.1#0"; "SHDOCVW.DLL"
Begin VB.Form Step4Browser 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 4 XML file view."
   ClientHeight    =   6390
   ClientLeft      =   225
   ClientTop       =   780
   ClientWidth     =   7335
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   6390
   ScaleWidth      =   7335
   Begin SHDocVwCtl.WebBrowser brwWebBrowser 
      Height          =   6375
      Left            =   0
      TabIndex        =   0
      Top             =   0
      Width           =   7335
      ExtentX         =   12938
      ExtentY         =   11245
      ViewMode        =   1
      Offline         =   0
      Silent          =   0
      RegisterAsBrowser=   0
      RegisterAsDropTarget=   0
      AutoArrange     =   -1  'True
      NoClientEdge    =   -1  'True
      AlignLeft       =   0   'False
      ViewID          =   "{0057D0E0-3573-11CF-AE69-08002B2E1262}"
      Location        =   ""
   End
End
Attribute VB_Name = "Step4Browser"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Private Sub Form_Load()

    Dim strXMLPath As String

    'Obtains the path of the stored XML file.
    strXMLPath = App.Path + "\Sample.xml"
    'Indicates it on the browser screen.
    brwWebBrowser.Navigate strXMLPath

End Sub
